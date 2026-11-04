import { useState } from 'react';

import { listProjectionsUseCase } from '@/application/retirement/use_cases/listProjectionsUseCase';
import {
  type ProjectionListRowVM,
  mapProjectionToListRowVM,
} from '@/ui/features/retirement/viewmodels/projectionList.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadOnce } from '@/ui/hooks/useLoadOnce';

export function useProjectionList(householdId: string | undefined) {
  const auth = useAuthIdentity();
  const [rows, setRows] = useState<ProjectionListRowVM[]>([]);

  const { loading, error, reload } = useLoadOnce(
    async () => (householdId ? listProjectionsUseCase.execute({ householdId, auth }) : []),
    (loaded) => setRows(loaded.map(mapProjectionToListRowVM)),
    [auth, householdId],
    { initiallyLoading: true },
  );

  return { rows, loading, error, reload };
}
