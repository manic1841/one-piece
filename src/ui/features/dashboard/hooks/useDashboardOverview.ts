import { useCallback, useEffect, useState } from 'react';

import { getDashboardOverviewUseCase } from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';
import { type DashboardOverview } from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';
import { useAuthContext } from '@/ui/hooks/useAuthContext';

import { mapDashboardOverviewToHeroVM } from '../viewmodels/dashboardHero.vm';
import { type DashboardHeroVM } from '../viewmodels/dashboardHero.vm';

export function useDashboardOverview(householdId: string | undefined) {
  const auth = useAuthContext();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    try {
      const result = await getDashboardOverviewUseCase.execute({ householdId, auth });
      setOverview(result);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard overview:', err);
      setOverview(null);
      setError('無法載入儀表板資料');
    } finally {
      setLoading(false);
    }
  }, [householdId, auth]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadData]);

  const heroVM: DashboardHeroVM = mapDashboardOverviewToHeroVM(overview);

  return {
    heroVM,
    loading,
    error,
    reload: loadData,
  };
}
