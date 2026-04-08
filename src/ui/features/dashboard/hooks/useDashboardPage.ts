import { useCallback, useEffect, useMemo, useState } from 'react';

import { getLeverageStatsUseCase } from '@/application/portfolio/use_cases/getLeverageStatsUseCase';
import { type LeverageStats } from '@/application/portfolio/use_cases/getLeverageStatsUseCase';
import { getUnsettledStatsUseCase } from '@/application/report/use_cases/getUnsettledStatsUseCase';
import { type UnsettledStats } from '@/application/report/use_cases/getUnsettledStatsUseCase';
import { type AuthContext } from '@/application/types';
import { useAuth } from '@/infra/contexts/useAuth';
import {
  mapLeverageStatsToCardVM,
  mapUnsettledStatsToCardVM,
} from '@/ui/features/dashboard/viewmodels/dashboardDisplay.vm';

interface UseDashboardPageProps {
  householdId: string | undefined;
  includeUnsettledStats?: boolean;
}

const EMPTY_LEVERAGE_STATS: LeverageStats = {
  totalExposure: 0,
  totalNetValue: 0,
  ratio: 0,
};

function createEmptyUnsettledStats(): UnsettledStats {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    unsettledAccounts: [],
    unsettledPortfolios: [],
    unsettledDebts: [],
    unsettledProjects: [],
    totalUnsettled: 0,
  };
}

export function useDashboardPage({
  householdId,
  includeUnsettledStats = false,
}: UseDashboardPageProps) {
  const { currentUser, isAdmin } = useAuth();
  const [unsettledStats, setUnsettledStats] = useState<UnsettledStats>(createEmptyUnsettledStats());
  const [leverageStats, setLeverageStats] = useState<LeverageStats>(EMPTY_LEVERAGE_STATS);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth: AuthContext = useMemo(
    () => ({
      uid: currentUser?.uid || '',
      email: currentUser?.email || undefined,
      isGlobalAdmin: isAdmin,
    }),
    [currentUser?.uid, currentUser?.email, isAdmin],
  );

  const loadStatsData = useCallback(async () => {
    if (!householdId) {
      setUnsettledStats(createEmptyUnsettledStats());
      setLeverageStats(EMPTY_LEVERAGE_STATS);
      return;
    }

    setStatsLoading(true);
    try {
      const [leverage, unsettled] = await Promise.all([
        getLeverageStatsUseCase.execute({ householdId, auth }),
        includeUnsettledStats
          ? getUnsettledStatsUseCase.execute({ householdId, auth })
          : Promise.resolve(createEmptyUnsettledStats()),
      ]);
      setUnsettledStats(unsettled ?? createEmptyUnsettledStats());
      setLeverageStats(leverage ?? EMPTY_LEVERAGE_STATS);
      setError(null);
    } catch (err) {
      console.error('Failed to load stats data:', err);
      setUnsettledStats(createEmptyUnsettledStats());
      setLeverageStats(EMPTY_LEVERAGE_STATS);
      setError('載入統計資料失敗，請稍後再試');
    } finally {
      setStatsLoading(false);
    }
  }, [householdId, auth, includeUnsettledStats]);

  useEffect(() => {
    loadStatsData();
  }, [loadStatsData]);

  return {
    unsettledStats,
    unsettledStatsVM: mapUnsettledStatsToCardVM(unsettledStats),
    leverageStats,
    leverageStatsVM: mapLeverageStatsToCardVM(leverageStats),
    statsLoading,
    error,
    reload: useCallback(() => {
      return loadStatsData();
    }, [loadStatsData]),
  };
}
