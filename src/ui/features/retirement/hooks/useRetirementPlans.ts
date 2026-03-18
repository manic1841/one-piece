import { useCallback, useMemo } from 'react';

import { type RetirementPlan } from '@/domains/retirement/types';
import { useAuth } from '@/infra/contexts/useAuth';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

import { getRetirementPlanUseCase } from '../../../../application/retirement/use_cases/getRetirementPlanUseCase';
import { listRetirementPlansUseCase } from '../../../../application/retirement/use_cases/listRetirementPlansUseCase';

export function useRetirementPlans(householdId: string | undefined) {
  const { currentUser, isAdmin } = useAuth();
  const { loading, error, run } = useLoadingTask();

  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser?.uid, isAdmin],
  );

  const listPlans = useCallback(async (): Promise<RetirementPlan[]> => {
    if (!householdId) return [];
    const result = await run(async () => {
      return listRetirementPlansUseCase.execute({ householdId, auth });
    });
    return result || [];
  }, [householdId, auth, run]);

  const getPlan = useCallback(
    async (planId: string): Promise<RetirementPlan | null> => {
      if (!householdId) return null;
      const result = await run(async () => {
        return getRetirementPlanUseCase.execute({ householdId, planId, auth });
      });
      return result || null;
    },
    [householdId, auth, run],
  );

  return {
    listPlans,
    getPlan,
    loading,
    error,
  };
}
