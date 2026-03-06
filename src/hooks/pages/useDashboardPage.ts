import { useCallback, useEffect, useState } from 'react';

import {
  type AssetTrendData,
  type AssetTrendViewMode,
  type LeverageStats,
  type UnsettledStats,
} from '@/domains/finance/types';
import { financialTrendService } from '@/services/financialTrendService';
import { portfolioService } from '@/services/portfolioService';
import { settlementService } from '@/services/settlementService';

interface UseDashboardPageProps {
  householdId: string | undefined;
}

export function useDashboardPage({ householdId }: UseDashboardPageProps) {
  const [trendData, setTrendData] = useState<AssetTrendData | null>(null);
  const [unsettledStats, setUnsettledStats] = useState<UnsettledStats | null>(null);
  const [leverageStats, setLeverageStats] = useState<LeverageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<AssetTrendViewMode>('month');

  const loadDashboardData = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    setError(null);

    try {
      const [trend, unsettled, leverage] = await Promise.all([
        financialTrendService.getTrendData(householdId, viewMode),
        settlementService.getUnsettledStats(householdId),
        portfolioService.getLeverageStats(householdId),
      ]);
      setTrendData(trend);
      setUnsettledStats(unsettled);
      setLeverageStats(leverage);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('無法載入儀表板數據，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }, [householdId, viewMode]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return {
    trendData,
    unsettledStats,
    leverageStats,
    loading,
    error,
    viewMode,
    setViewMode,
    reload: loadDashboardData,
  };
}
