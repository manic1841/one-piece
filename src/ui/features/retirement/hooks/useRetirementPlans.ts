import { useCallback } from 'react';

import { getRetirementPlanUseCase } from '@/application/retirement/use_cases/getRetirementPlanUseCase';
import { listRetirementPlansUseCase } from '@/application/retirement/use_cases/listRetirementPlansUseCase';
import { type RetirementPlan } from '@/domains/retirement/types';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { type LoadingTaskResult, useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useRetirementPlans(householdId: string | undefined) {
  const auth = useAuthIdentity();
  const { loading, error, errorMessage, run } = useLoadingTask();

  const listPlans = useCallback(async (): Promise<LoadingTaskResult<RetirementPlan[]>> => {
    if (!householdId) {
      return { ok: true, value: [] };
    }
    return run(async () => {
      return listRetirementPlansUseCase.execute({ householdId, auth });
    });
  }, [householdId, auth, run]);

  const getPlan = useCallback(
    async (planId: string): Promise<LoadingTaskResult<RetirementPlan | null>> => {
      if (!householdId) {
        return { ok: true, value: null };
      }
      return run(async () => {
        return getRetirementPlanUseCase.execute({ householdId, planId, auth });
      });
    },
    [householdId, auth, run],
  );

  return {
    listPlans,
    getPlan,
    loading,
    error,
    errorMessage,
  };
}
