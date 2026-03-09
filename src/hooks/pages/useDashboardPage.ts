import { useCallback, useEffect, useMemo, useState } from 'react';

import { aggregateTrendPoints } from '@/domains/finance/logic/trendAggregation';
import {
  type AssetTrendData,
  type AssetTrendViewMode,
  type LeverageStats,
  type TrendDataPoint,
  type UnsettledStats,
} from '@/domains/finance/types';
import { financialTrendService } from '@/services/financialTrendService';
import { portfolioService } from '@/services/portfolioService';
import { settlementService } from '@/services/settlementService';

interface UseDashboardPageProps {
  householdId: string | undefined;
}

export function useDashboardPage({ householdId }: UseDashboardPageProps) {
  const [rawTrendData, setRawTrendData] = useState<TrendDataPoint[]>([]);
  const [unsettledStats, setUnsettledStats] = useState<UnsettledStats | null>(null);
  const [leverageStats, setLeverageStats] = useState<LeverageStats | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<AssetTrendViewMode>('month');

  const trendData = useMemo<AssetTrendData>(() => {
    return aggregateTrendPoints(rawTrendData, viewMode);
  }, [rawTrendData, viewMode]);

  const loadTrendData = useCallback(async () => {
    if (!householdId) return;

    setTrendLoading(true);
    try {
      const rawPoints = await financialTrendService.getTrendData(householdId);
      setRawTrendData(rawPoints);
      setError(null);
    } catch (err) {
      console.error('Failed to load trend data:', err);
      setError('無法載入趨勢數據，請稍後再試。');
    } finally {
      setTrendLoading(false);
    }
  }, [householdId]);

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
    loadTrendData();
  }, [loadTrendData]);

  useEffect(() => {
    loadStatsData();
  }, [loadStatsData]);

  return {
    trendData,
    unsettledStats,
    leverageStats,
    trendLoading,
    statsLoading,
    error,
    viewMode,
    setViewMode,
    reload: useCallback(() => {
      loadTrendData();
      loadStatsData();
    }, [loadTrendData, loadStatsData]),
  };
}
