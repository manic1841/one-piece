import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/ui/components/PageHeader';
import { Button } from '@/ui/components/ui/button';
import { PLAN_CREATE_PAGE_LABELS } from '@/ui/constants/retirement/planCreateLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { PlanLoadStates } from '@/ui/features/retirement/components/PlanLoadStates';
import { RetirementPlanForm } from '@/ui/features/retirement/components/RetirementPlanForm';
import { useDebtAccountOptions } from '@/ui/features/retirement/hooks/useDebtAccountOptions';
import { usePlanForm } from '@/ui/features/retirement/hooks/usePlanForm';
import { PLAN_LIST_HREF } from '@/ui/features/retirement/hooks/usePlanResource';
import { useRetirementPlanCmds } from '@/ui/features/retirement/hooks/useRetirementPlanCmds';

/**
 * `/retirement/plans/new`, the plan form without a plan behind it. A plan is a
 * template, so it has the three input groups and a name but no opening balance,
 * start year or preview: nothing here is calculated. Starting from a plan
 * already in the workspace stays the faster route; this page is for authoring
 * one directly.
 */
export default function RetirementPlanCreatePage() {
  const navigate = useNavigate();
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId;
  const { createPlan } = useRetirementPlanCmds(householdId);
  const controller = usePlanForm({
    householdId,
    submit: (name, draft) => createPlan({ name, ...draft }),
    invalidMessage: PLAN_CREATE_PAGE_LABELS.INVALID,
    fallbackMessage: PLAN_CREATE_PAGE_LABELS.FAILED,
    successMessage: PLAN_CREATE_PAGE_LABELS.CREATED,
  });
  const { codes: ledgerCodes } = useLedgerCodes();
  const { accounts: debtAccounts } = useDebtAccountOptions(householdId);
  const { isSubmitting } = controller.form.formState;

  const backToList = () => void navigate(PLAN_LIST_HREF);

  return (
    <PlanLoadStates
      loading={controller.loading}
      errorMessage={controller.errorMessage}
      notFound={controller.notFound}
      reload={() => void controller.reload()}
      onBack={backToList}
      labels={PLAN_CREATE_PAGE_LABELS}
    >
      <RetirementPlanForm
        controller={controller}
        submitting={isSubmitting}
        readOnly={controller.readOnly}
        ledgerCodes={ledgerCodes}
        debtAccounts={debtAccounts}
        header={
          <PageHeader
            crumb={PLAN_CREATE_PAGE_LABELS.CRUMB}
            onBack={backToList}
            backLabel={PLAN_CREATE_PAGE_LABELS.BACK_TO_LIST}
            title={PLAN_CREATE_PAGE_LABELS.TITLE}
            description={
              controller.readOnly
                ? PLAN_CREATE_PAGE_LABELS.READ_ONLY
                : PLAN_CREATE_PAGE_LABELS.DESCRIPTION
            }
            actions={
              !controller.readOnly && (
                <Button onClick={() => void controller.submit()} disabled={isSubmitting}>
                  {isSubmitting ? PLAN_CREATE_PAGE_LABELS.CREATING : PLAN_CREATE_PAGE_LABELS.CREATE}
                </Button>
              )
            }
          />
        }
      />
    </PlanLoadStates>
  );
}
