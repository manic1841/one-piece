import { useCallback, useEffect, useState } from 'react';

import {
  type RetirementPlan,
  listRetirementPlans,
} from '@/application/retirement/use_cases/retirementPlanLookup';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useRetirementPlanList(householdId: string | undefined) {
  const auth = useAuthIdentity();
  const [plans, setPlans] = useState<RetirementPlan[]>([]);
  const { loading, errorMessage, run } = useLoadingTask({ initiallyLoading: true });

  const reload = useCallback(async () => {
    await run(async () => (householdId ? listRetirementPlans({ householdId, auth }) : []), {
      writeBack: (result) => {
        if (result.ok) setPlans(result.value);
      },
    });
  }, [auth, householdId, run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { plans, loading, errorMessage, reload };
}
