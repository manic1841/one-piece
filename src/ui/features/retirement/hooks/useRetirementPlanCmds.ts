import { useCallback } from 'react';

import { createRetirementPlanUseCase } from '@/application/retirement/use_cases/createRetirementPlanUseCase';
import { deleteRetirementPlanUseCase } from '@/application/retirement/use_cases/deleteRetirementPlanUseCase';
import { duplicateRetirementPlanUseCase } from '@/application/retirement/use_cases/duplicateRetirementPlanUseCase';
import { updateRetirementPlanUseCase } from '@/application/retirement/use_cases/updateRetirementPlanUseCase';
import { type RetirementPlanCreate } from '@/domains/retirement/types';
import { getErrorMessage } from '@/ui/hooks/getErrorMessage';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { type LoadingTaskResult, useLoadingTask } from '@/ui/hooks/useLoadingTask';

const MISSING_CONTEXT_MESSAGE = 'Missing household or user context. Please refresh and try again.';

export function useRetirementPlanCmds(
  householdId: string | undefined,
  userEmail: string | undefined,
) {
  const auth = useAuthIdentity();
  const { loading, error, errorMessage, run } = useLoadingTask();

  const createPlan = useCallback(
    async (plan: RetirementPlanCreate): Promise<LoadingTaskResult<string>> => {
      if (!householdId || !userEmail) {
        return { ok: false, kind: 'failed', error: new Error(MISSING_CONTEXT_MESSAGE) };
      }
      return run(async () => {
        return createRetirementPlanUseCase.execute({ householdId, plan, userEmail, auth });
      });
    },
    [householdId, userEmail, auth, run],
  );

  const updatePlan = useCallback(
    async (planId: string, updates: Partial<RetirementPlanCreate>): Promise<void> => {
      if (!householdId || !userEmail) {
        throw new Error(MISSING_CONTEXT_MESSAGE);
      }

      const result = await run(async () => {
        await updateRetirementPlanUseCase.execute({
          householdId,
          planId,
          updates,
          userEmail,
          auth,
        });
      });

      // An abandoned run has an unknown outcome: the underlying write cannot be
      // cancelled once started, so reporting it as a failure would be a guess.
      if (!result.ok && result.kind === 'aborted') return;

      if (!result.ok) {
        throw new Error(
          `Failed to update retirement plan in Firestore: ${getErrorMessage(result.error)}`,
        );
      }
    },
    [householdId, userEmail, auth, run],
  );

  const deletePlan = useCallback(
    async (planId: string): Promise<void> => {
      if (!householdId) return;
      await run(async () => {
        return deleteRetirementPlanUseCase.execute({ householdId, planId, auth });
      });
    },
    [householdId, auth, run],
  );

  const duplicatePlan = useCallback(
    async (sourcePlanId: string): Promise<LoadingTaskResult<string>> => {
      if (!householdId || !userEmail) {
        return { ok: false, kind: 'failed', error: new Error(MISSING_CONTEXT_MESSAGE) };
      }
      return run(async () => {
        return duplicateRetirementPlanUseCase.execute({
          householdId,
          sourcePlanId,
          userEmail,
          auth,
        });
      });
    },
    [householdId, userEmail, auth, run],
  );

  return {
    createPlan,
    updatePlan,
    deletePlan,
    duplicatePlan,
    loading,
    error,
    errorMessage,
  };
}
