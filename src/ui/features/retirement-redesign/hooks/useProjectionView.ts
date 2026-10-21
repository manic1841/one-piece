import { useCallback, useEffect, useState } from 'react';

import { deleteProjectionUseCase } from '@/application/retirement/use_cases/deleteProjectionUseCase';
import { getProjectionViewUseCase } from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { renameProjectionNameUseCase } from '@/application/retirement/use_cases/renameProjectionNameUseCase';
import { saveProjectionAsPlanUseCase } from '@/application/retirement/use_cases/saveProjectionAsPlanUseCase';
import {
  type ProjectionViewVM,
  mapProjectionViewToVM,
} from '@/ui/features/retirement-redesign/viewmodels/projectionViewVm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useProjectionView(
  householdId: string | undefined,
  projectionId: string | undefined,
) {
  const auth = useAuthIdentity();
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
      if (!householdId || !projectionId) return;
      await renameProjectionNameUseCase.execute({ householdId, projectionId, name, auth });
      setView((current) => (current === null ? null : { ...current, name }));
    },
    [auth, householdId, projectionId],
  );

  const remove = useCallback(async () => {
    if (!householdId || !projectionId) return;
    await deleteProjectionUseCase.execute({ householdId, projectionId, auth });
  }, [auth, householdId, projectionId]);

  const saveAsPlan = useCallback(
    async (name: string): Promise<boolean> => {
      if (!householdId || !projectionId) return false;
      try {
        await saveProjectionAsPlanUseCase.execute({
          householdId,
          projectionId,
          name,
          auth,
        });
        return true;
      } catch {
        return false;
      }
    },
    [auth, householdId, projectionId],
  );

  return {
    view,
    loading,
    error,
    notFound,
    reload: load,
    rename,
    remove,
    saveAsPlan,
  };
}
