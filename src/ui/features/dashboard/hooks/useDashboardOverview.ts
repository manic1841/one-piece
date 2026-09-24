import { useCallback, useEffect, useState } from 'react';

import { getDashboardOverviewUseCase } from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';
import { type DashboardOverview } from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import { mapDashboardOverviewToHeroVM } from '../viewmodels/dashboardHero.vm';
import { type DashboardHeroVM } from '../viewmodels/dashboardHero.vm';

const LOAD_ERROR = '無法載入儀表板資料';

export function useDashboardOverview(householdId: string | undefined) {
  const auth = useAuthIdentity();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const { loading, error, run } = useLoadingTask();
  const errorMessage = error === null ? null : LOAD_ERROR;

  const loadData = useCallback(async () => {
    if (!householdId) return;

    const result = await run(async () => {
      return getDashboardOverviewUseCase.execute({ householdId, auth });
    });
    setOverview(result.ok ? result.value : null);
  }, [householdId, auth, run]);

  useEffect(() => {
    // The analyzer cannot see through the awaited write-back in `loadData` and
    // reports this as a synchronous setState; the write-back lands in a promise
    // continuation, not in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const heroVM: DashboardHeroVM = mapDashboardOverviewToHeroVM(overview);

  return {
    overview,
    heroVM,
    loading,
    error,
    errorMessage,
    reload: loadData,
  };
}
