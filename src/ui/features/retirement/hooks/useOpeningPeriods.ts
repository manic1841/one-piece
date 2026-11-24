import { useCallback, useState } from 'react';

import { listProjectionOpeningPeriods } from '@/application/retirement/workflows/listProjectionOpeningPeriods';
import { type ReportValue } from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadOnce } from '@/ui/hooks/useLoadOnce';

import {
  type OpeningPeriodVM,
  mapOpeningPeriodToVM,
  mapOpeningPeriodsToVM,
} from '../viewmodels/openingPeriods.vm';

/**
 * The candidate months for the opening picker, plus the current anchor when it
 * falls outside them. The library only loads when the dialog mounts.
 */
export function useOpeningPeriods(householdId: string | undefined, anchorYearMonth: string | null) {
  const auth = useAuthIdentity();
  const [periods, setPeriods] = useState<OpeningPeriodVM[]>([]);
  const [pinned, setPinned] = useState<OpeningPeriodVM | null>(null);

  const {
    loading,
    error,
    reload: refresh,
  } = useLoadOnce(
    async () => {
      if (!householdId) return { periods: [], pinned: null };
      return listProjectionOpeningPeriods.execute({ householdId, auth, anchorYearMonth });
    },
    (result) => {
      setPeriods(mapOpeningPeriodsToVM(result.periods));
      setPinned(result.pinned === null ? null : mapOpeningPeriodToVM(result.pinned));
    },
    [auth, householdId, anchorYearMonth],
    { initiallyLoading: true },
  );

  const retry = useCallback(() => void refresh(), [refresh]);

  return { periods, pinned, loading, error, retry };
}

export type { ReportValue };
