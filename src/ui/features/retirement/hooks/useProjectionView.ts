import { useCallback, useEffect, useState } from 'react';

import { getProjectionViewUseCase } from '@/application/retirement/use_cases/getProjectionViewUseCase';
import {
  SAVE_AS_PLAN_ERROR_LABELS,
  SAVE_AS_PLAN_LABELS,
} from '@/ui/constants/retirement/projectionLabels';
import { useProjectionCmds } from '@/ui/features/retirement/hooks/useProjectionCmds';
import { useSaveNameForms } from '@/ui/features/retirement/hooks/useSaveNameForms';
import {
  type ProjectionViewVM,
  mapProjectionViewToVM,
} from '@/ui/features/retirement/viewmodels/projectionView.vm';
import { getTaskErrorMessage } from '@/ui/hooks/getErrorMessage';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { type LoadingTaskResult, useLoadingTask } from '@/ui/hooks/useLoadingTask';

const failed = (error: unknown): LoadingTaskResult<never> => ({
  ok: false,
  kind: 'failed',
  error,
});

export function useProjectionView(
  householdId: string | undefined,
  projectionId: string | undefined,
) {
  const auth = useAuthIdentity();
  const { renameProjection, deleteProjection, saveProjectionAsPlan, errorMessage } =
    useProjectionCmds(householdId);
  const { saveAsPlanForm, submitSaveAsPlanForm } = useSaveNameForms();
  const [view, setView] = useState<ProjectionViewVM | null>(null);
  const [notFound, setNotFound] = useState(false);
  const { loading, error, run } = useLoadingTask({ initiallyLoading: true });

  const load = useCallback(async () => {
    await run(
      async () => {
        if (!householdId || !projectionId) return null;
        return getProjectionViewUseCase.execute({ householdId, projectionId, auth });
      },
      {
        writeBack: (result) => {
          if (!result.ok) return;
          setNotFound(result.value === null);
          setView(result.value === null ? null : mapProjectionViewToVM(result.value));
        },
      },
    );
  }, [auth, householdId, projectionId, run]);

  useEffect(() => {
    void load();
  }, [load]);

  const rename = useCallback(
    async (name: string) => {
      if (!householdId || !projectionId) return failed(new Error('Missing projection.'));

      const task = await renameProjection(projectionId, name);
      if (!task.ok) return task;

      const outcome = task.value;
      if (!outcome.ok) return task;

      setView((current) => (current === null ? null : { ...current, name: outcome.name }));
      return task;
    },
    [householdId, projectionId, renameProjection],
  );

  const remove = useCallback(
    (): Promise<LoadingTaskResult<void>> =>
      projectionId
        ? deleteProjection(projectionId)
        : Promise.resolve(failed(new Error('Missing projection.'))),
    [deleteProjection, projectionId],
  );

  const saveAsPlan = useCallback(
    (name: string): Promise<LoadingTaskResult<{ ok: boolean; code?: string }>> =>
      projectionId
        ? saveProjectionAsPlan(projectionId, name)
        : Promise.resolve(failed(new Error('Missing projection.'))),
    [projectionId, saveProjectionAsPlan],
  );

  return {
    view,
    loading,
    error,
    errorMessage,
    notFound,
    reload: load,
    rename,
    remove,
    saveAsPlan,
    saveAsPlanForm,
    submitSaveAsPlan: (onSuccess?: () => void) =>
      submitSaveAsPlanForm(async (name) => {
        const task = await saveAsPlan(name);
        if (!task.ok) return { ok: false, messages: [getTaskErrorMessage(task)] };

        const outcome = task.value;
        if (!outcome.ok) {
          const code = outcome.code as keyof typeof SAVE_AS_PLAN_ERROR_LABELS;
          return {
            ok: false,
            messages: [SAVE_AS_PLAN_ERROR_LABELS[code] ?? SAVE_AS_PLAN_LABELS.FAILED],
          };
        }
        onSuccess?.();
        return { ok: true };
      }),
  };
}
