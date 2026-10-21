import { useCallback } from 'react';

import { deleteProjectionUseCase } from '@/application/retirement/use_cases/deleteProjectionUseCase';
import {
  type PersistProjectionOutcome,
  persistProjectionUseCase,
} from '@/application/retirement/use_cases/persistProjectionUseCase';
import {
  type RenameProjectionNameOutcome,
  renameProjectionNameUseCase,
} from '@/application/retirement/use_cases/renameProjectionNameUseCase';
import {
  type CalculateProjectionOutcome,
  calculateProjectionWorkflow,
} from '@/application/retirement/workflows/calculateProjection';
import {
  type SaveAsPlanOutcome,
  saveProjectionAsPlanWorkflow,
} from '@/application/retirement/workflows/saveProjectionAsPlan';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import { useRetirementPlanCmds } from '@/ui/features/retirement/hooks/useRetirementPlanCmds';
import { type SaveNameSubmitOutcome } from '@/ui/features/retirement/hooks/useSaveNameForm';
import { useSaveNameForm } from '@/ui/features/retirement/hooks/useSaveNameForm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { type LoadingTaskResult, useLoadingTask } from '@/ui/hooks/useLoadingTask';

type CalculateInput = Omit<
  Parameters<typeof calculateProjectionWorkflow.execute>[0],
  'householdId' | 'auth'
>;
type PersistInput = Omit<
  Parameters<typeof persistProjectionUseCase.execute>[0],
  'householdId' | 'auth'
>;

/**
 * Projection writes only. Reads live in the query hooks that compose this one.
 *
 * Every method runs through `useLoadingTask.run`, so infrastructure and
 * permission failures never throw; they resolve to `kind: 'failed'`. A
 * `calculate`/`persist` result therefore has two layers: the outer
 * `LoadingTaskResult` is infrastructure, and an inner `{ ok: false, code }` is a
 * domain/validation failure (it carries `issues`/`errors`). Callers narrow both.
 */
export function useProjectionCmds(householdId: string | undefined) {
  const auth = useAuthIdentity();
  const { createPlan, saveWorkspaceAsPlan, planForm, submitPlanForm } =
    useRetirementPlanCmds(householdId);
  const { run, errorMessage } = useLoadingTask();
  const saveNameForm = useSaveNameForm(PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_NAME_REQUIRED);
  const saveAsPlanNameForm = useSaveNameForm(
    PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_DIALOG_NAME_REQUIRED,
  );

  const calculate = useCallback(
    (input: CalculateInput): Promise<LoadingTaskResult<CalculateProjectionOutcome>> =>
      run(async () => {
        if (!householdId) return { ok: false, code: 'PROJECTION_VALIDATION_FAILED' };
        return calculateProjectionWorkflow.execute({ ...input, householdId, auth });
      }),
    [auth, householdId, run],
  );

  const persist = useCallback(
    (input: PersistInput): Promise<LoadingTaskResult<PersistProjectionOutcome>> =>
      run(async () => {
        if (!householdId) return { ok: false, code: 'PROJECTION_VALIDATION_FAILED' };
        return persistProjectionUseCase.execute({ ...input, householdId, auth });
      }),
    [auth, householdId, run],
  );

  const renameProjection = useCallback(
    (projectionId: string, name: string): Promise<LoadingTaskResult<RenameProjectionNameOutcome>> =>
      run(async () => {
        if (!householdId) return { ok: false, code: 'NAME_REQUIRED' };
        return renameProjectionNameUseCase.execute({ householdId, projectionId, name, auth });
      }),
    [auth, householdId, run],
  );

  const deleteProjection = useCallback(
    (projectionId: string): Promise<LoadingTaskResult<void>> =>
      run(async () => {
        if (!householdId) return undefined;
        return deleteProjectionUseCase.execute({ householdId, projectionId, auth });
      }),
    [auth, householdId, run],
  );

  /** New independent plan from a stored projection's frozen config. */
  const saveProjectionAsPlan = useCallback(
    (projectionId: string, name: string): Promise<LoadingTaskResult<SaveAsPlanOutcome>> =>
      run(async () => {
        if (!householdId) return { ok: false, code: 'PROJECTION_NOT_FOUND' };
        return saveProjectionAsPlanWorkflow.execute({
          householdId,
          projectionId,
          name,
          auth,
        });
      }),
    [auth, householdId, run],
  );

  return {
    calculate,
    persist,
    renameProjection,
    deleteProjection,
    saveProjectionAsPlan,
    createPlan,
    saveWorkspaceAsPlan,
    errorMessage,
    saveForm: saveNameForm.form,
    submitSaveForm: (onSubmit: (name: string) => Promise<SaveNameSubmitOutcome>) =>
      saveNameForm.submit(onSubmit),
    saveAsPlanForm: saveAsPlanNameForm.form,
    submitSaveAsPlanForm: (onSubmit: (name: string) => Promise<SaveNameSubmitOutcome>) =>
      saveAsPlanNameForm.submit(onSubmit),
    planForm,
    submitPlanForm,
  };
}
