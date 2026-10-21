import { useCallback, useEffect, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import {
  type RetirementPlan,
  deleteRetirementPlan,
  getRetirementPlan,
  renameRetirementPlan,
} from '@/application/retirement/use_cases/retirementPlanLookup';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { PLAN_DETAIL_LABELS } from '@/ui/constants/retirement-redesign/planLabels';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

/** Owns the read-only plan view: load, rename and delete. */
export function useRetirementPlanDetail(householdId: string | undefined) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuthIdentity();
  const { confirm } = useConfirm();

  const [plan, setPlan] = useState<RetirementPlan | null>(null);
  const { loading, errorMessage, run } = useLoadingTask({ initiallyLoading: true });

  const reload = useCallback(async () => {
    await run(
      async () => (householdId && id ? getRetirementPlan({ householdId, planId: id, auth }) : null),
      {
        writeBack: (result) => {
          if (result.ok) setPlan(result.value);
        },
      },
    );
  }, [auth, householdId, id, run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const rename = useCallback(
    async (name: string): Promise<boolean> => {
      if (!plan || !householdId) return false;

      const result = await renameRetirementPlan({
        householdId,
        planId: plan.id,
        name,
        userEmail: auth.email ?? '',
        auth,
      });
      if (!result.ok) return false;

      setPlan(result.plan);
      return true;
    },
    [auth, householdId, plan],
  );

  const remove = useCallback(async (): Promise<boolean> => {
    if (!plan || !householdId) return false;

    const confirmed = await confirm({
      title: PLAN_DETAIL_LABELS.DELETE_TITLE,
      context: plan.name,
      consequence: PLAN_DETAIL_LABELS.DELETE_CONSEQUENCE,
      confirmLabel: PLAN_DETAIL_LABELS.DELETE_CONFIRM,
    });
    if (!confirmed) return false;

    await deleteRetirementPlan({ householdId, planId: plan.id, auth });
    navigate('/retirement/plans');
    return true;
  }, [auth, confirm, householdId, navigate, plan]);

  return {
    plan,
    loading,
    errorMessage,
    notFound: !loading && errorMessage === null && plan === null,
    reload,
    rename,
    remove,
  };
}
