import { useState } from 'react';

import { useParams } from 'react-router-dom';

import { getRetirementPlanUseCase } from '@/application/retirement/use_cases/getRetirementPlanUseCase';
import { type RetirementPlan } from '@/domains/retirement/types';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadOnce } from '@/ui/hooks/useLoadOnce';

/** The plan list. A missing plan falls back here; the detail route would 404 again. */
export const PLAN_LIST_HREF = '/retirement/plans';

/**
 * Loads the plan named by the `:id` route param. Detail and edit both need the
 * same three states, so the read lives here once.
 *
 * `useLoadOnce` owns the supersede-abort: React Router reuses this hook when
 * navigating from plan A to plan B, so without it A's late response would
 * overwrite B while `planId` already says B — and the following rename or
 * delete would hit the wrong plan. A manual retry takes the same path.
 */
export function usePlanResource(householdId: string | undefined) {
  const { id } = useParams<{ id: string }>();
  const auth = useAuthIdentity();
  const [plan, setPlan] = useState<RetirementPlan | null>(null);
  /** The route id the last settled read belonged to, so `null` is not premature. */
  const [settledId, setSettledId] = useState<string | null>(null);

  const { loading, errorMessage, reload } = useLoadOnce(
    async () => {
      if (!householdId || !id) return { planId: null, plan: null };
      const loaded = await getRetirementPlanUseCase.execute({ householdId, planId: id, auth });
      return { planId: id, plan: loaded };
    },
    (value) => {
      setPlan(value.plan);
      setSettledId(value.planId);
    },
    [auth, householdId, id],
    { initiallyLoading: true },
  );

  // The previous plan stays in state until the new one lands; deriving on `id`
  // keeps the committed A object from rendering under B's route.
  const currentPlan = plan !== null && plan.id === id ? plan : null;
  /**
   * A route change commits a render before its effect starts the new read, so
   * `loading` is still false and `plan` still describes the previous route for
   * that frame. Without this the page would flash "not found" on every A→B hop.
   */
  const switching = settledId !== (id ?? null) && errorMessage === null;

  return {
    planId: id ?? null,
    plan: currentPlan,
    /** A write that succeeds locally can update the copy without a refetch. */
    setPlan,
    loading: loading || switching,
    errorMessage,
    notFound: !loading && !switching && errorMessage === null && currentPlan === null,
    reload,
  };
}
