import { useCallback, useEffect, useState } from 'react';

import { type RetirementPlan } from '@/domains/retirement/types';
import { useLoadingTask } from '@/hooks/useLoadingTask';
import { retirementPlanService } from '@/services/retirementPlanService';

export function useRetirementPlans(householdId?: string) {
  const [plans, setPlans] = useState<RetirementPlan[]>([]);
  const { loading, error, run } = useLoadingTask();

  const load = useCallback(async () => {
    run(async () => {
      if (!householdId) return;
      const data = await retirementPlanService.getRetirementPlans(householdId);
      setPlans(data);
    });
  }, [run, householdId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    plans,
    loading,
    error,
    reload: load,
  };
}
