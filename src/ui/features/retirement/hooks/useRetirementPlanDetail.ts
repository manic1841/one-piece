import { useCallback, useMemo } from 'react';

import { useNavigate } from 'react-router-dom';

import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { PLAN_DETAIL_LABELS } from '@/ui/constants/retirement/planLabels';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { useDebtAccountOptions } from '@/ui/features/retirement/hooks/useDebtAccountOptions';
import { PLAN_LIST_HREF, usePlanResource } from '@/ui/features/retirement/hooks/usePlanResource';
import { useRetirementPlanCmds } from '@/ui/features/retirement/hooks/useRetirementPlanCmds';
import { mapRetirementPlanToVM } from '@/ui/features/retirement/viewmodels/retirementPlan.vm';

/** Owns the read-only plan view: load, map to the view shape, rename and delete. */
export function useRetirementPlanDetail(householdId: string | undefined) {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { renamePlan, deletePlan, errorMessage: commandError } = useRetirementPlanCmds(householdId);
  const { plan, planId, setPlan, loading, errorMessage, notFound, reload } =
    usePlanResource(householdId);
  const { codes } = useLedgerCodes();
  const { accounts } = useDebtAccountOptions(householdId);

  const names = useMemo(
    () => ({
      ledger: new Map(codes.map((code) => [code.code, code.label] as const)),
      debt: new Map(accounts.map((account) => [account.id, account.name] as const)),
    }),
    [accounts, codes],
  );

  const vm = useMemo(
    () => (plan === null ? null : mapRetirementPlanToVM(plan, names, new Date().getFullYear())),
    [names, plan],
  );

  const rename = useCallback(
    async (name: string) => {
      if (!plan || !householdId) return null;

      const task = await renamePlan(plan.id, name);
      if (task.ok && task.value.ok) setPlan({ ...plan, name: task.value.name });
      return task;
    },
    [householdId, plan, renamePlan, setPlan],
  );

  const remove = useCallback(async () => {
    if (!plan || !householdId) return null;

    const confirmed = await confirm({
      title: PLAN_DETAIL_LABELS.DELETE_TITLE,
      context: plan.name,
      consequence: PLAN_DETAIL_LABELS.DELETE_CONSEQUENCE,
      confirmLabel: PLAN_DETAIL_LABELS.DELETE_CONFIRM,
    });
    if (!confirmed) return null;

    const task = await deletePlan(plan.id);
    if (task.ok) navigate(PLAN_LIST_HREF);
    return task;
  }, [confirm, deletePlan, householdId, navigate, plan]);

  return {
    vm,
    planId,
    loading,
    errorMessage: errorMessage ?? commandError,
    notFound,
    reload,
    rename,
    remove,
  };
}
