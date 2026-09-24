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

    await run(async () => getDashboardOverviewUseCase.execute({ householdId, auth }), {
      writeBack: (result) => setOverview(result.ok ? result.value : null),
    });
  }, [householdId, auth, run]);

  useEffect(() => {
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
