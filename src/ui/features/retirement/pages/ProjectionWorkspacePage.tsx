import { useRef, useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { PageHeader } from '@/ui/components/PageHeader';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { AssumptionsSection } from '@/ui/features/retirement/components/AssumptionsSection';
import { LifeEventsSection } from '@/ui/features/retirement/components/LifeEventsSection';
import { OpeningNetWorthSection } from '@/ui/features/retirement/components/OpeningNetWorthSection';
import { ProjectionResults } from '@/ui/features/retirement/components/ProjectionResults';
import { ProjectionRulesSection } from '@/ui/features/retirement/components/ProjectionRulesSection';
import { SaveProjectionDialog } from '@/ui/features/retirement/components/SaveProjectionDialog';
import { WorkspaceActionBar } from '@/ui/features/retirement/components/WorkspaceActionBar';
import { WorkspacePinnedBar } from '@/ui/features/retirement/components/WorkspacePinnedBar';
import { WorkspaceRail } from '@/ui/features/retirement/components/WorkspaceRail';
import { WorkspaceSteps } from '@/ui/features/retirement/components/WorkspaceSteps';
import { WorkspaceSummary } from '@/ui/features/retirement/components/WorkspaceSummary';
import { useDebtAccountOptions } from '@/ui/features/retirement/hooks/useDebtAccountOptions';
import { useProjectionWorkspace } from '@/ui/features/retirement/hooks/useProjectionWorkspace';
import { buildSourceInventory } from '@/ui/features/retirement/viewmodels/sourceInventory.vm';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

/**
 * `/retirement/new` projection workspace shell. Desktop is a two-column
 * workspace: inputs on the left in a fixed numbered order, derived summary in
 * the rail on the right, decisions in the fixed bottom bar. Mobile is one
 * column in the same reading order.
 */
export default function ProjectionWorkspacePage() {
  const navigate = useNavigate();
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId;
  const workspace = useProjectionWorkspace(householdId);
  const { codes: ledgerCodes } = useLedgerCodes();
  const { accounts: debtAccounts } = useDebtAccountOptions(householdId);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveAsPlanOpen, setSaveAsPlanOpen] = useState(false);
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

  const inventory = buildSourceInventory(
    workspace.rules.rules.map((rule) => ({
      sourceType: rule.sourceType,
      sourceId: rule.sourceId,
    })),
    [
      ...ledgerCodes.map((code) => ({
        id: code.code,
        label: code.label,
        type: code.type === 'income' ? ('income' as const) : ('expense' as const),
      })),
      ...debtAccounts.map((account) => ({
        id: account.id,
        label: account.name,
        type: 'debt' as const,
      })),
    ],
  );

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={PROJECTION_WORKSPACE_LABELS.TITLE}
        description={PROJECTION_WORKSPACE_LABELS.DESCRIPTION}
        actions={
          !isPreview && (
            <Button variant="text" size="sm" onClick={openSaveAsPlan}>
              {PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN}
            </Button>
          )
        }
      />

      <WorkspaceSteps stage={workspace.stage} />

      {workspace.preloadWarning !== null && (
        <Alert variant="warning" data-testid="preload-warning">
          <AlertDescription>{workspace.preloadWarning}</AlertDescription>
        </Alert>
      )}

      {workspace.appliedPlanName && (
        <div className="flex flex-wrap items-center gap-3" data-testid="applied-plan-name">
          <span className="text-xs tracking-wide text-muted-foreground uppercase">
            {PROJECTION_WORKSPACE_LABELS.APPLIED_PLAN_PREFIX}
          </span>
          <span className="text-sm font-medium">{workspace.appliedPlanName}</span>
          <Button variant="text" size="sm" onClick={() => void navigate('/retirement/new?pick')}>
            {PROJECTION_WORKSPACE_LABELS.CHANGE_PLAN}
          </Button>
        </div>
      )}

      <div
        className={cn(
          'grid gap-8',
          !isPreview && 'md:grid-cols-[minmax(0,42rem)_18rem] md:gap-x-16',
        )}
      >
        <div className="min-w-0 [&_label]:text-xs">
          {isPreview ? (
            <div className="grid gap-6">
              <WorkspaceSummary
                startYear={workspace.startYear}
                opening={workspace.opening}
                openingAmount={openingAmountText}
                assumptions={workspace.assumptions.values}
                rules={workspace.rules.rules}
                events={workspace.events.events}
                labelForSource={labelForSource}
              />

              <p className="text-sm text-muted-foreground">
                {PROJECTION_WORKSPACE_LABELS.PREVIEW_READONLY_NOTE}
              </p>

              {workspace.calculateError !== null && (
                <Alert variant="destructive">
                  <AlertDescription>{workspace.calculateError}</AlertDescription>
                </Alert>
              )}

              {workspace.warningLabels.length > 0 && (
                <Alert variant="warning" data-testid="projection-warnings">
                  <AlertDescription>
                    <ul className="list-disc space-y-1 pl-4">
                      {workspace.warningLabels.map((warning, index) => (
                        <li key={`${warning}-${index}`}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {workspace.calculated && (
                <ProjectionResults
                  projection={workspace.calculated.projection}
                  summary={workspace.calculated.summary}
                />
              )}

              {workspace.savedAsPlan && (
                <Alert data-testid="saved-as-plan-message">
                  <AlertDescription>
                    {PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_SAVED_MESSAGE}
                  </AlertDescription>
                </Alert>
              )}

              {workspace.savedId !== null && (
                <Alert>
                  <AlertDescription className="flex flex-wrap items-center gap-3">
                    <span>{PROJECTION_WORKSPACE_LABELS.SAVED_MESSAGE}</span>
                    <Link
                      to={`/retirement/projections/${workspace.savedId}`}
                      className="text-primary font-medium underline-offset-4 hover:underline"
                    >
                      {PROJECTION_WORKSPACE_LABELS.SAVED_LINK}
                    </Link>
                  </AlertDescription>
                </Alert>
              )}
            </div>
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
              />

              <AssumptionsSection
                form={workspace.assumptions.form}
                errors={workspace.assumptions.errors}
                birthYearLocked={workspace.assumptions.birthYearLocked}
                readOnly={isPreview}
                ageRange={workspace.ageRange}
                retirementYear={workspace.retirementYear}
                onRetirementAgeChange={(event) => workspace.setRetirementAge(event.target.value)}
                onFieldChange={workspace.setAssumptionField}
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
                  add={workspace.events.add}
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

              {workspace.savedAsPlan && (
                <Alert data-testid="saved-as-plan-message">
                  <AlertDescription>
                    {PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_SAVED_MESSAGE}
                  </AlertDescription>
                </Alert>
              )}

              {workspace.savedId !== null && (
                <Alert>
                  <AlertDescription className="flex flex-wrap items-center gap-3">
                    <span>{PROJECTION_WORKSPACE_LABELS.SAVED_MESSAGE}</span>
                    <Link
                      to={`/retirement/projections/${workspace.savedId}`}
                      className="text-primary font-medium underline-offset-4 hover:underline"
                    >
                      {PROJECTION_WORKSPACE_LABELS.SAVED_LINK}
                    </Link>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {!isPreview && (
          <WorkspaceRail
            className="md:sticky md:top-6 md:self-start"
            indicators={workspace.indicators}
            retirementYear={workspace.retirementYear}
            inventory={inventory}
            finalYear={finalYear}
            onJumpToYear={jumpToYear}
          />
        )}
      </div>

      <div className="sticky bottom-0 z-10">
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
          canUndo={workspace.canUndo}
          calculating={workspace.calculating}
          canSave={workspace.calculated !== null}
          onCancel={() => void navigate('/retirement')}
          onUndo={workspace.undo}
          onCalculate={() => void workspace.calculate()}
          onBack={workspace.backToSetup}
          onSave={openSave}
        />
      </div>

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
