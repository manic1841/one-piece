import { useCallback, useState } from 'react';

import { getRetirementPlanUseCase } from '@/application/retirement/use_cases/getRetirementPlanUseCase';
import { listRetirementPlansUseCase } from '@/application/retirement/use_cases/listRetirementPlansUseCase';
import { type RetirementPlan } from '@/domains/retirement/types';
import { useLoadOnce } from '@/ui/features/retirement/hooks/useLoadOnce';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

export interface PlanSummary {
  id: string;
  name: string;
}

/** Plan picker library: summaries for the dialog, full plans on apply. */
export function usePlanLibrary(householdId: string | undefined) {
  const auth = useAuthIdentity();
  const [plans, setPlans] = useState<PlanSummary[]>([]);

  const {
    loading,
    error,
    reload: refresh,
  } = useLoadOnce(
    async () => {
      if (!householdId) return [];
      const loaded = await listRetirementPlansUseCase.execute({ householdId, auth });
      return loaded.map(({ id, name }) => ({ id, name }));
    },
    setPlans,
    [auth, householdId],
    { initiallyLoading: true },
  );

  const getPlan = useCallback(
    (planId: string): Promise<RetirementPlan | null> =>
      householdId
        ? getRetirementPlanUseCase.execute({ householdId, planId, auth })
        : Promise.resolve(null),
    [auth, householdId],
  );

  return { plans, loading, error, refresh, getPlan };
}
