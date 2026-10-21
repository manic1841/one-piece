import { useState } from 'react';

import { listRetirementPlansUseCase } from '@/application/retirement/use_cases/listRetirementPlansUseCase';
import { type RetirementPlan } from '@/domains/retirement/types';
import { useLoadOnce } from '@/ui/features/retirement-redesign/hooks/useLoadOnce';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

export function useRetirementPlanList(householdId: string | undefined) {
  const auth = useAuthIdentity();
  const [plans, setPlans] = useState<RetirementPlan[]>([]);

  const { loading, errorMessage, reload } = useLoadOnce(
    async () => (householdId ? listRetirementPlansUseCase.execute({ householdId, auth }) : []),
    setPlans,
    [auth, householdId],
    { initiallyLoading: true },
  );

  return { plans, loading, errorMessage, reload };
}
