import { useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/ui/components/PageHeader';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { PREVIEW_LABELS } from '@/ui/constants/retirement/previewLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { AssumptionsSection } from '@/ui/features/retirement/components/AssumptionsSection';
import { LifeEventsSection } from '@/ui/features/retirement/components/LifeEventsSection';
import { OpeningNetWorthSection } from '@/ui/features/retirement/components/OpeningNetWorthSection';
import { ProjectionRulesSection } from '@/ui/features/retirement/components/ProjectionRulesSection';
import { ProjectionStartDialog } from '@/ui/features/retirement/components/ProjectionStartDialog';
import { SaveProjectionDialog } from '@/ui/features/retirement/components/SaveProjectionDialog';
import { WorkspaceActionBar } from '@/ui/features/retirement/components/WorkspaceActionBar';
import { WorkspaceNotices } from '@/ui/features/retirement/components/WorkspaceNotices';
import { WorkspacePinnedBar } from '@/ui/features/retirement/components/WorkspacePinnedBar';
import { WorkspacePreview } from '@/ui/features/retirement/components/WorkspacePreview';
import { WorkspaceRail } from '@/ui/features/retirement/components/WorkspaceRail';
import { WorkspaceSteps } from '@/ui/features/retirement/components/WorkspaceSteps';
import { useDebtAccountOptions } from '@/ui/features/retirement/hooks/useDebtAccountOptions';
import { useProjectionWorkspace } from '@/ui/features/retirement/hooks/useProjectionWorkspace';
import { buildSectionState } from '@/ui/features/retirement/viewmodels/workspaceSectionState.vm';
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
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveAsPlanOpen, setSaveAsPlanOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const lifeEventsRef = useRef<HTMLDivElement>(null);
  const [revealYear, setRevealYear] = useState<number | null>(null);
  const isPreview = workspace.stage === 'preview';

  const birthYear = Number(workspace.assumptions.values.birthYear);
  const lifeExpectancy = Number(workspace.assumptions.values.lifeExpectancy);
  const finalYear =
    Number.isFinite(birthYear) &&
    Number.isFinite(lifeExpectancy) &&
    birthYear > 0 &&
    lifeExpectancy > 0
      ? birthYear + lifeExpectancy
      : null;

  const labelForSource = (sourceId: string) =>
    ledgerCodes.find((code) => code.code === sourceId)?.label ?? PROJECTION_COMMON_LABELS.DASH;

  const jumpToYear = (year: number) => {
    lifeEventsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setRevealYear(year);
  };

  const openSave = () => {
    workspace.saveForm.reset({
      name: workspace.lastSavedName ?? workspace.appliedPlanName ?? workspace.defaultName(),
    });
    setSaveOpen(true);
  };

  const openSaveAsPlan = () => {
    workspace.saveAsPlanForm.reset({ name: workspace.appliedPlanName ?? '' });
    setSaveAsPlanOpen(true);
  };

  const rememberEvents = () => {
    const snapshot = workspace.events.snapshot();
    workspace.pushUndo(() => workspace.events.replaceDrafts(snapshot));
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

  const changeRange = (
    eventId: string,
    phaseId: string,
    targetEventId: string,
    startYear: number,
    endYear: number,
  ) => {
    if (eventId === targetEventId) {
      workspace.events.setPhaseRange(eventId, phaseId, startYear, endYear);
      return;
    }
    workspace.events.movePhase(eventId, phaseId, targetEventId, startYear, endYear);
  };

  const openingAmountText = (() => {
    const amount = Number(workspace.opening.amountText);
    return workspace.opening.amountText.trim() === '' || !Number.isFinite(amount)
      ? null
      : formatCurrency(amount);
  })();
  const showRail = !isPreview && workspace.indicators.status !== 'idle';

  const sectionState = buildSectionState({
    blockers: workspace.readiness.blockers,
    openingValidationError: workspace.openingValidationError,
    assumptionsInvalid: Object.keys(workspace.assumptions.errors).length > 0,
    rulesInvalid: Object.keys(workspace.rules.errors).length > 0,
    eventsInvalid: Object.keys(workspace.events.errors).length > 0,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={PROJECTION_WORKSPACE_LABELS.TITLE}
        onBack={() => void navigate('/retirement')}
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
        <div className="min-w-0 [&_label]:text-xs">
          {isPreview ? (
            <WorkspacePreview
              retirementComparisons={workspace.retirementComparisons}
              onApplyRetirementAge={workspace.applyRetirementAge}
              appliedPlanName={workspace.appliedPlanName}
              startYear={workspace.startYear}
              opening={workspace.opening}
              openingAmount={openingAmountText}
              assumptions={workspace.assumptions.values}
              rules={workspace.rules.rules}
              events={workspace.events.events}
              labelForSource={labelForSource}
              calculateError={workspace.calculateError}
              warningLabels={workspace.warningLabels}
              calculated={workspace.calculated}
              savedAsPlan={workspace.savedAsPlan}
              savedId={workspace.savedId}
            />
          ) : (
            <div className="grid">
              <OpeningNetWorthSection
                opening={workspace.opening}
                stage={workspace.stage}
                loading={workspace.openingLoading}
                error={workspace.openingError}
                validationError={workspace.openingValidationError}
                hasClosedPeriod={workspace.hasClosedPeriod}
                hasSnapshot={workspace.hasSnapshot}
                startYear={workspace.startYear}
                startYearError={workspace.startYearValidationError}
                setStartYear={workspace.setStartYear}
                setAmount={workspace.setOpeningAmount}
                commitAmount={workspace.commitOpeningAmount}
                resetToSnapshot={workspace.resetToSnapshot}
                retry={workspace.retryOpening}
                status={
                  workspace.openingValidationError === undefined
                    ? sectionState.baseline?.status
                    : 'error'
                }
                hint={sectionState.baseline?.hint}
              />

              <AssumptionsSection
                form={workspace.assumptions.form}
                errors={workspace.assumptions.errors}
                bounds={workspace.assumptionBounds}
                birthYearLocked={workspace.assumptions.birthYearLocked}
                readOnly={isPreview}
                ageRange={workspace.ageRange}
                retirementYear={workspace.retirementYear}
                onRetirementAgeChange={workspace.setRetirementAge}
                onFieldChange={workspace.setAssumptionField}
                status={sectionState.assumptions?.status}
                hint={sectionState.assumptions?.hint}
              />

              <ProjectionRulesSection
                form={workspace.rules.form}
                rules={workspace.rules.rules}
                errors={workspace.rules.errors}
                readOnly={isPreview}
                ledgerCodes={ledgerCodes}
                debtAccounts={debtAccounts}
                add={workspace.rules.add}
                remove={workspace.rules.remove}
                replace={workspace.rules.replace}
                toggle={workspace.rules.toggle}
                update={workspace.rules.update}
                setRuleType={workspace.rules.setRuleType}
                setMethod={workspace.rules.setMethod}
                setSourceType={workspace.rules.setSourceType}
                status={sectionState.rules?.status}
                hint={sectionState.rules?.hint}
              />

              <div id="life-events" ref={lifeEventsRef} className="scroll-mt-6">
                <LifeEventsSection
                  form={workspace.events.form}
                  events={workspace.events.events}
                  errors={workspace.events.errors}
                  readOnly={isPreview}
                  focusRequest={workspace.events.focusRequest}
                  projectionStartYear={workspace.startYear}
                  birthYear={birthYear || workspace.startYear}
                  lifeExpectancy={lifeExpectancy || 1}
                  retirementYear={workspace.retirementYear}
                  revealYear={revealYear}
                  canUndo={workspace.canUndo}
                  onUndo={workspace.undo}
                  remove={workspace.events.remove}
                  toggle={workspace.events.toggle}
                  update={workspace.events.update}
                  setType={workspace.events.setType}
                  addPhase={workspace.events.addPhase}
                  addPhaseAt={workspace.events.addPhaseAt}
                  addEventWithPhase={workspace.events.addEventWithPhase}
                  removePhase={workspace.events.removePhase}
                  updatePhase={workspace.events.updatePhase}
                  onGestureStart={rememberEvents}
                  onRangeChange={changeRange}
                  status={sectionState.events?.status}
                  hint={sectionState.events?.hint}
                />
              </div>

              {!workspace.calculated && workspace.errorLabels.length > 0 && (
                <div className="space-y-1" role="alert" data-testid="projection-errors">
                  {workspace.errorLabels.map((error, index) => (
                    <p key={`${error}-${index}`} className="text-negative text-sm">
                      {error}
                    </p>
                  ))}
                </div>
              )}

              {workspace.calculateError !== null && (
                <Alert variant="destructive">
                  <AlertDescription>{workspace.calculateError}</AlertDescription>
                </Alert>
              )}

              <WorkspaceNotices savedAsPlan={workspace.savedAsPlan} savedId={workspace.savedId} />
            </div>
          )}
        </div>

        {showRail && (
          <WorkspaceRail
            className="md:sticky md:top-6 md:self-start"
            indicators={workspace.indicators}
            retirementYear={workspace.retirementYear}
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
            readiness={workspace.readiness}
            indicators={workspace.indicators}
            onJumpToYear={jumpToYear}
          />
        )}

        <WorkspaceActionBar
          preview={isPreview}
          readiness={workspace.readiness}
          calculating={workspace.calculating}
          canSave={workspace.calculated !== null}
          onCalculate={() => void workspace.calculate()}
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

      {saveOpen && (
        <SaveProjectionDialog
          open
          form={workspace.saveForm}
          submit={() => workspace.submitSave(() => setSaveOpen(false))}
          onCancel={() => setSaveOpen(false)}
        />
      )}

      {saveAsPlanOpen && (
        <SaveProjectionDialog
          open
          title={PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_DIALOG_TITLE}
          nameLabel={PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_DIALOG_NAME}
          confirmLabel={PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_DIALOG_CONFIRM}
          savingLabel={PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_DIALOG_SAVING}
          form={workspace.saveAsPlanForm}
          submit={() => workspace.submitSaveAsPlan(() => setSaveAsPlanOpen(false))}
          onCancel={() => setSaveAsPlanOpen(false)}
        />
      )}
    </div>
  );
}
