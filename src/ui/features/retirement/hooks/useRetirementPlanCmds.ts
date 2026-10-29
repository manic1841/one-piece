import { useCallback } from 'react';

import { type PlanDraft } from '@/application/retirement/types';
import {
  type CreateRetirementPlanOutcome,
  createRetirementPlanUseCase,
} from '@/application/retirement/use_cases/createRetirementPlanUseCase';
import { deleteRetirementPlanUseCase } from '@/application/retirement/use_cases/deleteRetirementPlanUseCase';
import {
  type UpdateRetirementPlanOutcome,
  updateRetirementPlanUseCase,
} from '@/application/retirement/use_cases/updateRetirementPlanUseCase';
import { saveWorkspaceAsPlanWorkflow } from '@/application/retirement/workflows/saveWorkspaceAsPlan';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { type LoadingTaskResult, useLoadingTask } from '@/ui/hooks/useLoadingTask';

/**
 * Plan writes only. Reads live in the query hooks that compose this one, and the
 * save-name forms live in `useSaveNameForms` (they are Controller state, not
 * commands).
 *
 * Like the projection commands, every method resolves through `run`: an
 * infrastructure failure is the outer `kind: 'failed'`, a validation failure is
 * the inner `{ ok: false, code }`.
 */
export function useRetirementPlanCmds(householdId: string | undefined) {
  const auth = useAuthIdentity();
  const { run, errorMessage } = useLoadingTask();

  const createPlan = useCallback(
    (draft: PlanDraft): Promise<LoadingTaskResult<CreateRetirementPlanOutcome>> =>
      run(async () => {
        if (!householdId) return { ok: false, code: 'PLAN_INVALID' };
        return createRetirementPlanUseCase.execute({ ...draft, householdId, auth });
      }),
    [auth, householdId, run],
  );

  const renamePlan = useCallback(
    (planId: string, name: string): Promise<LoadingTaskResult<UpdateRetirementPlanOutcome>> =>
      run(async () => {
        if (!householdId) return { ok: false, code: 'PLAN_NOT_FOUND' };
        return updateRetirementPlanUseCase.execute({ householdId, planId, name, auth });
      }),
    [auth, householdId, run],
  );

  const updatePlan = useCallback(
    (planId: string, draft: PlanDraft): Promise<LoadingTaskResult<UpdateRetirementPlanOutcome>> =>
      run(async () => {
        if (!householdId) return { ok: false, code: 'PLAN_NOT_FOUND' };
        return updateRetirementPlanUseCase.execute({ ...draft, householdId, planId, auth });
      }),
    [auth, householdId, run],
  );

  const saveWorkspaceAsPlan = useCallback(
    (draft: PlanDraft) =>
      run(async () => {
        if (!householdId) return { ok: false as const, code: 'PLAN_INVALID' as const };
        return saveWorkspaceAsPlanWorkflow.execute({ ...draft, householdId, auth });
      }),
    [auth, householdId, run],
  );

  const deletePlan = useCallback(
    (planId: string): Promise<LoadingTaskResult<void>> =>
      run(async () => {
        if (!householdId) return undefined;
        return deleteRetirementPlanUseCase.execute({ householdId, planId, auth });
      }),
    [auth, householdId, run],
  );

  return {
    createPlan,
    saveWorkspaceAsPlan,
    renamePlan,
    updatePlan,
    deletePlan,
    errorMessage,
  };
}
