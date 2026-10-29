import { useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/ui/components/PageHeader';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { PREVIEW_LABELS } from '@/ui/constants/retirement/previewLabels';
import { PROJECTION_VIEW_LABELS } from '@/ui/constants/retirement/projectionLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { ProjectionStartDialog } from '@/ui/features/retirement/components/ProjectionStartDialog';
import { SaveProjectionDialog } from '@/ui/features/retirement/components/SaveProjectionDialog';
import { WorkspaceActionBar } from '@/ui/features/retirement/components/WorkspaceActionBar';
import { WorkspacePinnedBar } from '@/ui/features/retirement/components/WorkspacePinnedBar';
import { WorkspacePreview } from '@/ui/features/retirement/components/WorkspacePreview';
import { WorkspaceRail } from '@/ui/features/retirement/components/WorkspaceRail';
import { WorkspaceSetupSections } from '@/ui/features/retirement/components/WorkspaceSetupSections';
import { WorkspaceSteps } from '@/ui/features/retirement/components/WorkspaceSteps';
import { useDebtAccountOptions } from '@/ui/features/retirement/hooks/useDebtAccountOptions';
import { useProjectionWorkspace } from '@/ui/features/retirement/hooks/useProjectionWorkspace';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

/**
 * `/retirement/new` projection workspace shell, and the blank start of a new
 * projection. Desktop is a two-column
 * workspace: inputs on the left in a fixed numbered order, derived summary in
 * the rail on the right, decisions in the fixed bottom bar. Mobile is one
 * column in the same reading order.
 */
export default function ProjectionWorkspacePage() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId;
  const workspace = useProjectionWorkspace(householdId);
  const { codes: ledgerCodes } = useLedgerCodes();
  const { accounts: debtAccounts } = useDebtAccountOptions(householdId);
  const [startOpen, setStartOpen] = useState(false);
  const lifeEventsRef = useRef<HTMLDivElement>(null);
  const [revealYear, setRevealYear] = useState<number | null>(null);
  const isPreview = workspace.stage === 'preview';
  const finalYear = workspace.derived.finalYear;

  const labelForSource = (sourceId: string) =>
    ledgerCodes.find((code) => code.code === sourceId)?.label ?? PROJECTION_COMMON_LABELS.DASH;

  const jumpToYear = (year: number) => {
    lifeEventsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setRevealYear(year);
  };

  const openSave = () => {
    workspace.save.saveForm.open(
      workspace.save.lastSavedName ?? workspace.appliedPlanName ?? workspace.save.defaultName(),
    );
  };

  const openSaveAsPlan = () => {
    workspace.save.saveAsPlanForm.open(workspace.appliedPlanName ?? '');
  };

  /**
   * Starting over discards the draft, so a dirty workspace confirms first. The
   * confirm stacks on the open picker; cancelling it leaves the picker up.
   * REPLACE keeps the guard quiet — same pathname, the workspace rewriting its
   * own query.
   */
  const chooseStart = async (planId: string | null) => {
    if (workspace.dirty) {
      const confirmed = await confirm({
        title: PROJECTION_WORKSPACE_LABELS.LEAVE_TITLE,
        context: PROJECTION_WORKSPACE_LABELS.LEAVE_CONTEXT,
        consequence: PROJECTION_WORKSPACE_LABELS.LEAVE_CONSEQUENCE,
        confirmLabel: PROJECTION_WORKSPACE_LABELS.LEAVE_CONFIRM,
        cancelLabel: PROJECTION_WORKSPACE_LABELS.LEAVE_CANCEL,
      });
      if (!confirmed) return;
    }

    setStartOpen(false);
    // A plan re-applies itself from the query; blank has nothing to read, so the
    // draft is reset here before the query is dropped. Re-picking the plan that
    // is already in the query leaves the URL unchanged, so ask directly.
    if (planId === null) workspace.resetToBlank();
    else if (planId === workspace.planId) workspace.reapplyPlan();

    navigate(planId === null ? '/retirement/new' : `/retirement/new?plan=${planId}`, {
      replace: true,
    });
  };

  const openingAmountText = (() => {
    const amount = Number(workspace.opening.value.amountText);
    return workspace.opening.value.amountText.trim() === '' || !Number.isFinite(amount)
      ? null
      : formatCurrency(amount);
  })();
  const showRail = !isPreview && workspace.indicators.status !== 'idle';

  const sectionState = workspace.sectionState(
    workspace.derived.readiness.blockers,
    workspace.opening.validationError,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={PROJECTION_WORKSPACE_LABELS.TITLE}
        onBack={() => void navigate('/retirement')}
        backLabel={PROJECTION_VIEW_LABELS.BACK_TO_LIST}
        description={
          !isPreview && workspace.appliedPlanName ? (
            <span
              className="flex flex-wrap items-baseline gap-x-1.5"
              data-testid="applied-plan-name"
            >
              <span>{PROJECTION_WORKSPACE_LABELS.DESCRIPTION}</span>
              <span aria-hidden="true">·</span>
              <span>{PROJECTION_WORKSPACE_LABELS.PLAN_CONTEXT_PREFIX}</span>
              <span className="font-medium text-foreground">{workspace.appliedPlanName}</span>
              <Button
                variant="text"
                size="sm"
                className="h-auto px-0 py-0 text-xs"
                onClick={() => setStartOpen(true)}
              >
                {PROJECTION_WORKSPACE_LABELS.CHANGE_PLAN}
              </Button>
            </span>
          ) : isPreview ? (
            PREVIEW_LABELS.DESCRIPTION
          ) : (
            PROJECTION_WORKSPACE_LABELS.DESCRIPTION
          )
        }
        actions={
          !isPreview && (
            <div className="flex items-center gap-2">
              {/* Blank starts get the picker here; applied ones already have it
                  inline in the description. */}
              {!workspace.appliedPlanName && (
                <Button variant="text" size="sm" onClick={() => setStartOpen(true)}>
                  {PROJECTION_WORKSPACE_LABELS.CHANGE_PLAN}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={openSaveAsPlan}>
                {PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN}
              </Button>
            </div>
          )
        }
      />

      <WorkspaceSteps stage={workspace.stage} />

      {workspace.preloadWarning !== null && (
        <Alert variant="warning" data-testid="preload-warning">
          <AlertDescription>{workspace.preloadWarning}</AlertDescription>
        </Alert>
      )}

      <div
        className={cn('grid gap-8', showRail && 'md:grid-cols-[minmax(0,52rem)_14rem] md:gap-x-10')}
      >
        <div className="min-w-0">
          {isPreview ? (
            <WorkspacePreview
              retirementComparisons={workspace.calc.retirementComparisons}
              onApplyRetirementAge={workspace.calc.applyRetirementAge}
              appliedPlanName={workspace.appliedPlanName}
              startYear={workspace.startYear}
              opening={workspace.opening.value}
              openingAmount={openingAmountText}
              assumptions={workspace.assumptions.values}
              rules={workspace.rules.rules}
              events={workspace.events.events}
              labelForSource={labelForSource}
              calculateError={workspace.calc.calculateError}
              warningLabels={workspace.calc.warningLabels}
              calculated={workspace.calc.calculated}
              savedAsPlan={workspace.save.savedAsPlan}
              savedId={workspace.save.savedId}
            />
          ) : (
            <WorkspaceSetupSections
              stage={workspace.stage}
              opening={workspace.opening}
              assumptions={workspace.assumptions}
              rules={workspace.rules}
              events={workspace.events}
              startYear={workspace.startYear}
              setStartYear={workspace.setStartYear}
              setRetirementAge={workspace.setRetirementAge}
              setAssumptionField={workspace.setAssumptionField}
              derived={workspace.derived}
              undo={workspace.undo}
              calc={workspace.calc}
              save={workspace.save}
              sectionState={sectionState}
              ledgerCodes={ledgerCodes}
              debtAccounts={debtAccounts}
              lifeEventsRef={lifeEventsRef}
              revealYear={revealYear}
            />
          )}
        </div>

        {showRail && (
          <WorkspaceRail
            className="md:sticky md:top-6 md:self-start"
            indicators={workspace.indicators}
            retirementYear={workspace.derived.retirementYear}
            finalYear={finalYear}
            onJumpToYear={jumpToYear}
          />
        )}
      </div>

      {/* Docks above whatever the shell publishes as a bottom overlay (the
          emulator banner) so the primary action is never covered. */}
      <div className="sticky bottom-[var(--bottom-overlay,0px)] z-10">
        {!isPreview && (
          <WorkspacePinnedBar
            readiness={workspace.derived.readiness}
            indicators={workspace.indicators}
            onJumpToYear={jumpToYear}
          />
        )}

        <WorkspaceActionBar
          preview={isPreview}
          readiness={workspace.derived.readiness}
          calculating={workspace.calc.calculating}
          canSave={workspace.calc.calculated !== null}
          onCalculate={() => void workspace.calc.calculate()}
          onBack={workspace.backToSetup}
          onSave={openSave}
        />
      </div>

      {startOpen && (
        <ProjectionStartDialog
          onSelectBlank={() => void chooseStart(null)}
          onSelectPlan={(planId) => void chooseStart(planId)}
          onCancel={() => setStartOpen(false)}
        />
      )}

      {workspace.save.saveForm.isOpen && (
        <SaveProjectionDialog
          open
          form={workspace.save.saveForm.field}
          submit={() =>
            workspace.save.saveForm.submit(workspace.save.save, workspace.save.saveForm.close)
          }
          onCancel={workspace.save.saveForm.close}
        />
      )}

      {workspace.save.saveAsPlanForm.isOpen && (
        <SaveProjectionDialog
          open
          title={PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_DIALOG_TITLE}
          nameLabel={PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_DIALOG_NAME}
          confirmLabel={PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_DIALOG_CONFIRM}
          savingLabel={PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_DIALOG_SAVING}
          form={workspace.save.saveAsPlanForm.field}
          submit={() =>
            workspace.save.saveAsPlanForm.submit(
              workspace.save.saveAsPlan,
              workspace.save.saveAsPlanForm.close,
            )
          }
          onCancel={workspace.save.saveAsPlanForm.close}
        />
      )}
    </div>
  );
}
