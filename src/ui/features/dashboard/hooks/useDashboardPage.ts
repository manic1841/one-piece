import { useCallback, useEffect, useState } from 'react';

import { getLeverageStatsUseCase } from '@/application/portfolio/use_cases/getLeverageStatsUseCase';
import { type LeverageStats } from '@/application/portfolio/use_cases/getLeverageStatsUseCase';
import { getSettlementReadinessUseCase } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { type SettlementReadiness } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import {
  mapLeverageStatsToCardVM,
  mapUnsettledStatsToCardVM,
} from '@/ui/features/dashboard/viewmodels/dashboardDisplay.vm';
import { useAuthContext } from '@/ui/hooks/useAuthContext';

interface UseDashboardPageProps {
  householdId: string | undefined;
  includeUnsettledStats?: boolean;
}

const EMPTY_LEVERAGE_STATS: LeverageStats = {
  totalExposure: 0,
  totalNetValue: 0,
  ratio: 0,
};

function createEmptySettlementReadiness(): SettlementReadiness {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    isReady: true,
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
  const auth = useAuthContext();
  const [unsettledStats, setUnsettledStats] = useState<SettlementReadiness>(
    createEmptySettlementReadiness(),
  );
  const [leverageStats, setLeverageStats] = useState<LeverageStats>(EMPTY_LEVERAGE_STATS);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatsData = useCallback(async () => {
    if (!householdId) {
      setUnsettledStats(createEmptySettlementReadiness());
      setLeverageStats(EMPTY_LEVERAGE_STATS);
      return;
    }

    setStatsLoading(true);
    try {
      const [leverage, unsettled] = await Promise.all([
        getLeverageStatsUseCase.execute({ householdId, auth }),
        includeUnsettledStats
          ? getSettlementReadinessUseCase.execute({ householdId, auth })
          : Promise.resolve(createEmptySettlementReadiness()),
      ]);
      setUnsettledStats(unsettled ?? createEmptySettlementReadiness());
      setLeverageStats(leverage ?? EMPTY_LEVERAGE_STATS);
      setError(null);
    } catch (err) {
      console.error('Failed to load stats data:', err);
      setUnsettledStats(createEmptySettlementReadiness());
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
    unsettledStatsVM: mapUnsettledStatsToCardVM(unsettledStats),
    leverageStatsVM: mapLeverageStatsToCardVM(leverageStats),
    statsLoading,
    error,
    reload: useCallback(() => {
      return loadStatsData();
    }, [loadStatsData]),
  };
}
