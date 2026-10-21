import { useState } from 'react';

import { Link } from 'react-router-dom';

import { PageHeader } from '@/ui/components/PageHeader';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { PLAN_APPLY_LABELS } from '@/ui/constants/retirement-redesign/setupLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement-redesign/workspaceLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { ApplyPlanDialog } from '@/ui/features/retirement-redesign/components/ApplyPlanDialog';
import { AssumptionsSection } from '@/ui/features/retirement-redesign/components/AssumptionsSection';
import { LifeEventsSection } from '@/ui/features/retirement-redesign/components/LifeEventsSection';
import { OpeningNetWorthSection } from '@/ui/features/retirement-redesign/components/OpeningNetWorthSection';
import { ProjectionResults } from '@/ui/features/retirement-redesign/components/ProjectionResults';
import { ProjectionRulesSection } from '@/ui/features/retirement-redesign/components/ProjectionRulesSection';
import { SaveProjectionDialog } from '@/ui/features/retirement-redesign/components/SaveProjectionDialog';
import { WorkspaceSteps } from '@/ui/features/retirement-redesign/components/WorkspaceSteps';
import { useDebtAccountOptions } from '@/ui/features/retirement-redesign/hooks/useDebtAccountOptions';
import { usePlanLibrary } from '@/ui/features/retirement-redesign/hooks/usePlanLibrary';
import { useProjectionWorkspace } from '@/ui/features/retirement-redesign/hooks/useProjectionWorkspace';

const pad = (value: number): string => String(value).padStart(2, '0');

function defaultProjectionName(): string {
  const now = new Date();
  return `${PROJECTION_WORKSPACE_LABELS.DEFAULT_NAME_PREFIX} ${now.getFullYear()}-${pad(
    now.getMonth() + 1,
  )}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/**
 * `/retirement/new` projection workspace shell. Both stages share this route
 * and one in-memory draft; only the stage flag decides editability.
 */
export default function ProjectionWorkspacePage() {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId;
  const workspace = useProjectionWorkspace(householdId);
  const planLibrary = usePlanLibrary(householdId);
  const { codes: ledgerCodes } = useLedgerCodes();
  const { accounts: debtAccounts } = useDebtAccountOptions(householdId);
  const [applyOpen, setApplyOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveDefaultName, setSaveDefaultName] = useState('');
  const [lastSavedName, setLastSavedName] = useState<string | null>(null);
  const isPreview = workspace.stage === 'preview';

  const handleApply = async (planId: string) => {
    const plan = await planLibrary.getPlan(planId);
    if (!plan) return false;
    workspace.applyPlan(plan);
    setApplyOpen(false);
    return true;
  };

  const openSave = () => {
    setSaveDefaultName(lastSavedName ?? workspace.appliedPlanName ?? defaultProjectionName());
    setSaveOpen(true);
  };

  const handleSave = async (name: string): Promise<boolean> => {
    const id = await workspace.save(name);
    if (id === null) return false;

    setLastSavedName(name);
    setSaveOpen(false);
    return true;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={PROJECTION_WORKSPACE_LABELS.TITLE}
        description={PROJECTION_WORKSPACE_LABELS.DESCRIPTION}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setApplyOpen(true)}>
              {PROJECTION_WORKSPACE_LABELS.APPLY_PLAN}
            </Button>
            <Button variant="outline" size="sm" disabled>
              {PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN}
            </Button>
          </>
        }
      />

      <WorkspaceSteps stage={workspace.stage} />

      {workspace.preloadWarning !== null && (
        <Alert variant="warning" data-testid="preload-warning">
          <AlertDescription>{workspace.preloadWarning}</AlertDescription>
        </Alert>
      )}

      {workspace.appliedPlanName && (
        <p className="text-sm text-muted-foreground" data-testid="applied-plan-name">
          {PLAN_APPLY_LABELS.APPLIED_PREFIX} {workspace.appliedPlanName}
        </p>
      )}

      <div className="grid grid-cols-1 gap-2">
        <OpeningNetWorthSection
          opening={workspace.opening}
          stage={workspace.stage}
          loading={workspace.openingLoading}
          error={workspace.openingError}
          validationError={workspace.openingValidationError}
          hasClosedPeriod={workspace.hasClosedPeriod}
          canUseReportValue={workspace.canUseReportValue}
          setAmount={workspace.setOpeningAmount}
          enterManual={workspace.enterManual}
          useManualValue={workspace.useManualValue}
          useReportValue={workspace.useReportValue}
          retry={workspace.retryOpening}
        />

        <AssumptionsSection
          values={workspace.assumptions.values}
          errors={workspace.assumptions.errors}
          birthYearLocked={workspace.assumptions.birthYearLocked}
          readOnly={isPreview}
          setField={workspace.assumptions.setField}
        />

        <ProjectionRulesSection
          rules={workspace.rules.rules}
          errors={workspace.rules.errors}
          readOnly={isPreview}
          ledgerCodes={ledgerCodes}
          debtAccounts={debtAccounts}
          add={workspace.rules.add}
          remove={workspace.rules.remove}
          toggle={workspace.rules.toggle}
          update={workspace.rules.update}
          setRuleType={workspace.rules.setRuleType}
          setMethod={workspace.rules.setMethod}
          setSourceType={workspace.rules.setSourceType}
        />

        <LifeEventsSection
          events={workspace.events.events}
          errors={workspace.events.errors}
          readOnly={isPreview}
          focusRequest={workspace.events.focusRequest}
          add={workspace.events.add}
          remove={workspace.events.remove}
          toggle={workspace.events.toggle}
          update={workspace.events.update}
          setType={workspace.events.setType}
          addPhase={workspace.events.addPhase}
          removePhase={workspace.events.removePhase}
          updatePhase={workspace.events.updatePhase}
        />
      </div>

      {isPreview && (
        <p className="text-sm text-muted-foreground">
          {PROJECTION_WORKSPACE_LABELS.PREVIEW_READONLY_NOTE}
        </p>
      )}

      {workspace.calculateError !== null && (
        <Alert variant="destructive">
          <AlertDescription>{workspace.calculateError}</AlertDescription>
        </Alert>
      )}

      {isPreview && workspace.warningLabels.length > 0 && (
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

      {workspace.calculating && (
        <p className="text-sm text-muted-foreground">{PROJECTION_WORKSPACE_LABELS.CALCULATING}</p>
      )}

      {isPreview && workspace.calculated && (
        <ProjectionResults
          projection={workspace.calculated.projection}
          summary={workspace.calculated.summary}
        />
      )}

      {!workspace.calculated && workspace.errorLabels.length > 0 && (
        <div className="space-y-1" role="alert" data-testid="projection-errors">
          {workspace.errorLabels.map((error, index) => (
            <p key={`${error}-${index}`} className="text-sm text-negative">
              {error}
            </p>
          ))}
        </div>
      )}

      {workspace.savedId !== null && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{PROJECTION_WORKSPACE_LABELS.SAVED_MESSAGE}</span>
            <Link
              to={`/retirement/projections/${workspace.savedId}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {PROJECTION_WORKSPACE_LABELS.SAVED_LINK}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {isPreview ? (
          <>
            <Button variant="outline" onClick={workspace.backToSetup}>
              {PROJECTION_WORKSPACE_LABELS.BACK_TO_SETUP}
            </Button>
            <Button onClick={openSave} disabled={!workspace.calculated}>
              {PROJECTION_WORKSPACE_LABELS.SAVE}
            </Button>
          </>
        ) : (
          <Button onClick={() => void workspace.calculate()} disabled={workspace.calculating}>
            {workspace.calculating
              ? PROJECTION_WORKSPACE_LABELS.CALCULATING
              : PROJECTION_WORKSPACE_LABELS.CALCULATE}
          </Button>
        )}
      </div>

      {saveOpen && (
        <SaveProjectionDialog
          open
          defaultName={saveDefaultName}
          onCancel={() => setSaveOpen(false)}
          onSave={handleSave}
        />
      )}

      <ApplyPlanDialog
        open={applyOpen}
        plans={planLibrary.plans}
        loading={planLibrary.loading}
        loadError={!!planLibrary.error}
        onCancel={() => setApplyOpen(false)}
        onRetry={() => void planLibrary.refresh()}
        onApply={handleApply}
      />
    </div>
  );
}
