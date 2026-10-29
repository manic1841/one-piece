import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/ui/components/PageHeader';
import { Button } from '@/ui/components/ui/button';
import { PLAN_CREATE_PAGE_LABELS } from '@/ui/constants/retirement/planCreateLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { RetirementPlanForm } from '@/ui/features/retirement/components/RetirementPlanForm';
import { useDebtAccountOptions } from '@/ui/features/retirement/hooks/useDebtAccountOptions';
import { useRetirementPlanCreate } from '@/ui/features/retirement/hooks/useRetirementPlanCreate';

/**
 * `/retirement/plans/new`, the plan form. A plan is a template, so it has the
 * three input groups and a name but no opening balance, start year or preview:
 * nothing here is calculated. Starting from a plan already in the workspace
 * stays the faster route; this page is for authoring one directly.
 */
export default function RetirementPlanCreatePage() {
  const navigate = useNavigate();
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId;
  const controller = useRetirementPlanCreate(householdId);
  const { codes: ledgerCodes } = useLedgerCodes();
  const { accounts: debtAccounts } = useDebtAccountOptions(householdId);
  const { isSubmitting } = controller.form.formState;

  const backToList = () => void navigate('/retirement/plans');

  return (
    <RetirementPlanForm
      controller={controller}
      submitting={isSubmitting}
      readOnly={false}
      ledgerCodes={ledgerCodes}
      debtAccounts={debtAccounts}
      header={
        <PageHeader
          crumb={PLAN_CREATE_PAGE_LABELS.CRUMB}
          onBack={backToList}
          backLabel={PLAN_CREATE_PAGE_LABELS.BACK_TO_LIST}
          title={PLAN_CREATE_PAGE_LABELS.TITLE}
          description={PLAN_CREATE_PAGE_LABELS.DESCRIPTION}
          actions={
            <Button onClick={() => void controller.submit()} disabled={isSubmitting}>
              {isSubmitting ? PLAN_CREATE_PAGE_LABELS.CREATING : PLAN_CREATE_PAGE_LABELS.CREATE}
            </Button>
          }
        />
      }
    />
  );
}
