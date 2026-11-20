import { useCallback, useEffect, useRef } from 'react';

import { getRetirementPlanUseCase } from '@/application/retirement/use_cases/getRetirementPlanUseCase';
import { type AuthContext } from '@/application/types';
import { type RetirementPlan } from '@/domains/retirement/types';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';

interface UsePlanPreloadArgs {
  householdId: string | undefined;
  /** Route query `?plan=`; `null` means there is no plan to start from. */
  planId: string | null;
  auth: AuthContext;
  applyPlan: (plan: RetirementPlan) => void;
  setWarning: (warning: string | null) => void;
  clearParams: () => void;
}

/**
 * Applies a plan chosen in the entry dialog. The dialog click is the intent, so
 * a successful read applies immediately with no second confirmation. A failed
 * read keeps the blank setup and warns.
 */
export function usePlanPreload({
  householdId,
  planId,
  auth,
  applyPlan,
  setWarning,
  clearParams,
}: UsePlanPreloadArgs) {
  const startedRef = useRef<string | null>(null);

  const preload = useCallback(
    async (id: string) => {
      const plan =
        householdId === undefined
          ? null
          : await getRetirementPlanUseCase
              .execute({ householdId, planId: id, auth })
              .catch(() => null);

      if (plan === null) {
        setWarning(PROJECTION_WORKSPACE_LABELS.PLAN_PRELOAD_FAILED);
      } else {
        applyPlan(plan);
      }
      clearParams();
    },
    [applyPlan, auth, clearParams, householdId, setWarning],
  );

  useEffect(() => {
    if (planId === null || startedRef.current === planId) return;

    // Start after the current task: StrictMode tears the first mount down before
    // its run could settle, and the cleanup below lets the second mount start it.
    startedRef.current = planId;
    const timer = setTimeout(() => void preload(planId), 0);
    return () => {
      clearTimeout(timer);
      startedRef.current = null;
    };
  }, [planId, preload]);

  // Choosing the same plan again does not change the query, so the effect above
  // stays silent; the picker calls this to re-apply on purpose.
  return preload;
}
