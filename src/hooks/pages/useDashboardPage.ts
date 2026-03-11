import { useCallback, useEffect, useState } from 'react';

import { type LeverageStats, type UnsettledStats } from '@/domains/finance/types';
import { portfolioService } from '@/services/portfolioService';
import { settlementService } from '@/services/settlementService';

interface UseDashboardPageProps {
  householdId: string | undefined;
}

export function useDashboardPage({ householdId }: UseDashboardPageProps) {
  const [unsettledStats, setUnsettledStats] = useState<UnsettledStats | null>(null);
  const [leverageStats, setLeverageStats] = useState<LeverageStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatsData = useCallback(async () => {
    if (!householdId) return;

    setStatsLoading(true);
    try {
      const [unsettled, leverage] = await Promise.all([
        settlementService.getUnsettledStats(householdId),
        portfolioService.getLeverageStats(householdId),
      ]);
      setUnsettledStats(unsettled);
      setLeverageStats(leverage);
      setError(null);
    } catch (err) {
      console.error('Failed to load stats data:', err);
      setError('無法載入統計數據，請稍後再試。');
    } finally {
      setStatsLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    loadStatsData();
  }, [loadStatsData]);

  return {
    unsettledStats,
    leverageStats,
    statsLoading,
    error,
    reload: useCallback(() => {
      loadStatsData();
    }, [loadStatsData]),
  };
}
