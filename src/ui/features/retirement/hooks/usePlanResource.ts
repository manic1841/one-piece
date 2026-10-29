import { useCallback, useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';

import { getRetirementPlanUseCase } from '@/application/retirement/use_cases/getRetirementPlanUseCase';
import { type RetirementPlan } from '@/domains/retirement/types';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

/** The plan list. A missing plan falls back here; the detail route would 404 again. */
export const PLAN_LIST_HREF = '/retirement/plans';

/**
 * Loads the plan named by the `:id` route param. Detail and edit both need the
 * same three states, so the read lives here once.
 */
export function usePlanResource(householdId: string | undefined) {
  const { id } = useParams<{ id: string }>();
  const auth = useAuthIdentity();
  const [plan, setPlan] = useState<RetirementPlan | null>(null);
  const { loading, errorMessage, run } = useLoadingTask({ initiallyLoading: true });

  const reload = useCallback(async () => {
    await run(
      async () =>
        householdId && id
          ? getRetirementPlanUseCase.execute({ householdId, planId: id, auth })
          : null,
      { writeBack: (result) => result.ok && setPlan(result.value) },
    );
  }, [auth, householdId, id, run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    planId: id ?? null,
    plan,
    /** A write that succeeds locally can update the copy without a refetch. */
    setPlan,
    loading,
    errorMessage,
    notFound: !loading && errorMessage === null && plan === null,
    reload,
  };
}
