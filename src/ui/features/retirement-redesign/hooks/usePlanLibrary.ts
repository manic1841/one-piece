import { useCallback, useEffect, useState } from 'react';

import {
  type RetirementPlanSummary,
  getRetirementPlanForWorkspace,
  listRetirementPlanSummaries,
} from '@/application/retirement/use_cases/retirementPlanLookup';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export type PlanSummary = RetirementPlanSummary;

/**
 * Minimal plan library seam. #339 replaces the data functions with repository
 * use cases; the hook surface is the swap point.
 */
export function usePlanLibrary(householdId: string | undefined) {
  const [plans, setPlans] = useState<RetirementPlanSummary[]>([]);
  const { loading, error, run } = useLoadingTask({ initiallyLoading: true });

  const refresh = useCallback(async () => {
    await run(async () => (householdId ? listRetirementPlanSummaries(householdId) : []), {
      writeBack: (result) => {
        if (result.ok) setPlans(result.value);
      },
    });
  }, [householdId, run]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getPlan = useCallback(
    (planId: string) =>
      householdId ? getRetirementPlanForWorkspace(householdId, planId) : Promise.resolve(null),
    [householdId],
  );

  return { plans, loading, error, refresh, getPlan };
}
