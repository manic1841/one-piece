import { useCallback } from 'react';

import { type AuthContext } from '@/application/types';
import { type RetirementPlan } from '@/domains/retirement/types';
import { type PlanDraftPayload } from '@/ui/features/retirement/hooks/usePlanDrafts';
import { usePlanPreload } from '@/ui/features/retirement/hooks/usePlanPreload';

interface UseWorkspaceScenarioArgs {
  householdId: string | undefined;
  /** Route query `?plan=`; `null` means there is no plan to apply. */
  planId: string | null;
  auth: AuthContext;
  /** Turns a plan into the three draft groups; the opening and start year stay put. */
  replaceGroups: (payload: PlanDraftPayload) => void;
  /** Wipes every draft back to blank, the opening and start year included. */
  resetDraftsToBlank: () => void;
  /** Opening + start year only: the parts a plan does not carry. */
  resetBase: () => void;
  /** Runs after the drafts are swapped, so the shell can drop the stale result. */
  onSwapped: (appliedPlanName: string | null) => void;
  setWarning: (warning: string | null) => void;
  clearParams: () => void;
}

/**
 * Swapping the whole scenario: a stored plan replaces the draft, a blank restart
 * empties it. Both throw away the previous result, so both funnel through
 * `onSwapped` instead of repeating the cleanup.
 */
export function useWorkspaceScenario({
  householdId,
  planId,
  auth,
  replaceGroups,
  resetDraftsToBlank,
  resetBase,
  onSwapped,
  setWarning,
  clearParams,
}: UseWorkspaceScenarioArgs) {
  const applyPlan = useCallback(
    (plan: RetirementPlan) => {
      replaceGroups({
        assumptions: plan.assumptions,
        projectionRules: plan.projectionRules,
        lifeEvents: plan.lifeEvents,
      });
      // A plan carries assumptions, rules and events only. Everything else goes
      // back to its blank default so the result is not a mix of two scenarios.
      resetBase();
      onSwapped(plan.name);
    },
    [onSwapped, replaceGroups, resetBase],
  );

  /**
   * Discard everything and start over blank. The route does not change element
   * on a same-path restart, so nothing unmounts — the reset has to happen here.
   */
  const resetToBlank = useCallback(() => {
    resetDraftsToBlank();
    onSwapped(null);
  }, [onSwapped, resetDraftsToBlank]);

  const applyPlanById = usePlanPreload({
    householdId,
    planId,
    auth,
    applyPlan,
    setWarning,
    clearParams,
  });

  /**
   * Re-apply the plan already in the query. Picking the same plan again keeps
   * the URL identical, so the preload effect will not fire on its own.
   */
  const reapplyPlan = useCallback(() => {
    if (planId !== null) void applyPlanById(planId);
  }, [applyPlanById, planId]);

  return { applyPlan, resetToBlank, reapplyPlan };
}
