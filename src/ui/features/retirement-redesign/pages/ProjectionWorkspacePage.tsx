import { useState } from 'react';

import { PageHeader } from '@/ui/components/PageHeader';
import { Button } from '@/ui/components/ui/button';
import { PLAN_APPLY_LABELS } from '@/ui/constants/retirement-redesign/setupLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement-redesign/workspaceLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { ApplyPlanDialog } from '@/ui/features/retirement-redesign/components/ApplyPlanDialog';
import { AssumptionsSection } from '@/ui/features/retirement-redesign/components/AssumptionsSection';
import { LifeEventsSection } from '@/ui/features/retirement-redesign/components/LifeEventsSection';
import { OpeningNetWorthSection } from '@/ui/features/retirement-redesign/components/OpeningNetWorthSection';
import { ProjectionRulesSection } from '@/ui/features/retirement-redesign/components/ProjectionRulesSection';
import { WorkspaceSteps } from '@/ui/features/retirement-redesign/components/WorkspaceSteps';
import { useDebtAccountOptions } from '@/ui/features/retirement-redesign/hooks/useDebtAccountOptions';
import { usePlanLibrary } from '@/ui/features/retirement-redesign/hooks/usePlanLibrary';
import { useProjectionWorkspace } from '@/ui/features/retirement-redesign/hooks/useProjectionWorkspace';

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
  const isPreview = workspace.stage === 'preview';

  const handleApply = async (planId: string) => {
    const plan = await planLibrary.getPlan(planId);
    if (!plan) return false;
    workspace.applyPlan(plan);
    setApplyOpen(false);
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

      <div className="flex flex-wrap justify-end gap-2">
        {isPreview ? (
          <>
            <Button variant="outline" onClick={workspace.backToSetup}>
              {PROJECTION_WORKSPACE_LABELS.BACK_TO_SETUP}
            </Button>
            <Button disabled>{PROJECTION_WORKSPACE_LABELS.SAVE}</Button>
          </>
        ) : (
          <Button onClick={workspace.goToPreview}>{PROJECTION_WORKSPACE_LABELS.PREVIEW}</Button>
        )}
      </div>

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
