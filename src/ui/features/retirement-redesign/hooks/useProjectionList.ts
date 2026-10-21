import { useCallback, useEffect, useState } from 'react';

import { listProjectionsUseCase } from '@/application/retirement/use_cases/listProjectionsUseCase';
import {
  type ProjectionListRowVM,
  mapProjectionToListRowVM,
} from '@/ui/features/retirement-redesign/viewmodels/projectionListVm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useProjectionList(householdId: string | undefined) {
  const auth = useAuthIdentity();
  const [rows, setRows] = useState<ProjectionListRowVM[]>([]);
  const { loading, error, run } = useLoadingTask({ initiallyLoading: true });

  const load = useCallback(async () => {
    await run(
      async () => {
        if (!householdId) return [];
        return listProjectionsUseCase.execute({ householdId, auth });
      },
      {
        writeBack: (result) => {
          if (result.ok) setRows(result.value.map(mapProjectionToListRowVM));
        },
      },
    );
  }, [auth, householdId, run]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, error, reload: load };
}
