import { useState } from 'react';

import { listProjectionsUseCase } from '@/application/retirement/use_cases/listProjectionsUseCase';
import { useLoadOnce } from '@/ui/features/retirement/hooks/useLoadOnce';
import {
  type ProjectionListRowVM,
  mapProjectionToListRowVM,
} from '@/ui/features/retirement/viewmodels/projectionListVm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

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
