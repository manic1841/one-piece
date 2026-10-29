import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/ui/components/PageHeader';
import { Button } from '@/ui/components/ui/button';
import { PLAN_EDIT_LABELS } from '@/ui/constants/retirement/planLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { PlanLoadStates } from '@/ui/features/retirement/components/PlanLoadStates';
import { RetirementPlanForm } from '@/ui/features/retirement/components/RetirementPlanForm';
import { useDebtAccountOptions } from '@/ui/features/retirement/hooks/useDebtAccountOptions';
import { usePlanForm } from '@/ui/features/retirement/hooks/usePlanForm';
import { PLAN_LIST_HREF } from '@/ui/features/retirement/hooks/usePlanResource';
import { useRetirementPlanCmds } from '@/ui/features/retirement/hooks/useRetirementPlanCmds';

/** `/retirement/plans/:id/edit`: the plan form, seeded from a stored plan. */
export default function RetirementPlanEditPage() {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updatePlan } = useRetirementPlanCmds(householdId);
  const controller = usePlanForm({
    householdId,
    submit: (name, draft) =>
      id === undefined
        ? Promise.resolve({
            ok: true as const,
            value: { ok: false as const, code: 'PLAN_NOT_FOUND' },
          })
        : updatePlan(id, { name, ...draft }),
    invalidMessage: PLAN_EDIT_LABELS.INVALID,
    fallbackMessage: PLAN_EDIT_LABELS.SAVE_FAILED,
    successMessage: PLAN_EDIT_LABELS.SAVED,
  });
  const { codes } = useLedgerCodes();
  const { accounts } = useDebtAccountOptions(householdId);
  const isSubmitting = controller.form.formState.isSubmitting;
  const { readOnly } = controller;

  const backToPlan = () => void navigate(controller.back);
  const backToList = () => void navigate(PLAN_LIST_HREF);

  return (
    <PlanLoadStates
      loading={controller.loading}
      errorMessage={controller.errorMessage}
      notFound={controller.notFound}
      reload={() => void controller.reload()}
      onBack={backToPlan}
      onNotFoundBack={backToList}
      labels={PLAN_EDIT_LABELS}
    >
      <RetirementPlanForm
        controller={controller}
        submitting={isSubmitting}
        readOnly={readOnly}
        ledgerCodes={codes}
        debtAccounts={accounts}
        header={
          <PageHeader
            crumb={PLAN_EDIT_LABELS.CRUMB}
            onBack={backToPlan}
            backLabel={PLAN_EDIT_LABELS.BACK_LABEL}
            title={PLAN_EDIT_LABELS.TITLE}
            description={readOnly ? PLAN_EDIT_LABELS.READ_ONLY : PLAN_EDIT_LABELS.DESCRIPTION}
            actions={
              !readOnly && (
                <Button onClick={() => void controller.submit()} disabled={isSubmitting}>
                  {isSubmitting ? PLAN_EDIT_LABELS.SAVING : PLAN_EDIT_LABELS.SAVE}
                </Button>
              )
            }
          />
        }
      />
    </PlanLoadStates>
  );
}
