import { useCallback, useEffect, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { getRetirementPlanUseCase } from '@/application/retirement/use_cases/getRetirementPlanUseCase';
import { type RetirementPlan } from '@/domains/retirement/types';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { PLAN_DETAIL_LABELS } from '@/ui/constants/retirement/planLabels';
import { useRetirementPlanCmds } from '@/ui/features/retirement/hooks/useRetirementPlanCmds';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

/** Owns the read-only plan view: load, rename and delete. */
export function useRetirementPlanDetail(householdId: string | undefined) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuthIdentity();
  const { confirm } = useConfirm();
  const { renamePlan, deletePlan, errorMessage: commandError } = useRetirementPlanCmds(householdId);

  const [plan, setPlan] = useState<RetirementPlan | null>(null);
  const { loading, errorMessage, run } = useLoadingTask({ initiallyLoading: true });

  const reload = useCallback(async () => {
    await run(
      async () =>
        householdId && id
          ? getRetirementPlanUseCase.execute({ householdId, planId: id, auth })
          : null,
      {
        writeBack: (result) => {
          if (result.ok) setPlan(result.value);
        },
      },
    );
  }, [auth, householdId, id, run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const rename = useCallback(
    async (name: string) => {
      if (!plan || !householdId) return null;

      const task = await renamePlan(plan.id, name);
      if (task.ok && task.value.ok) setPlan({ ...plan, name: task.value.name });
      return task;
    },
    [householdId, plan, renamePlan],
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
    if (task.ok) navigate('/retirement/plans');
    return task;
  }, [confirm, deletePlan, householdId, navigate, plan]);

  return {
    plan,
    loading,
    errorMessage: errorMessage ?? commandError,
    notFound: !loading && errorMessage === null && plan === null,
    reload,
    rename,
    remove,
  };
}
