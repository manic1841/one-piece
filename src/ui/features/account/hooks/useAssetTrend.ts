import { useCallback, useEffect, useMemo, useState } from 'react';

import { aggregateTrendPoints } from '@/domains/report/logic/trendAggregation';
import {
  type AssetTrendData,
  type AssetTrendViewMode,
} from '@/domains/report/logic/trendAggregation';
import { type TrendDataPoint } from '@/domains/report/types';
import { getYearlyProjection } from '@/domains/retirement/logic/retirementCalculator';
import { type RetirementPlan } from '@/domains/retirement/types';
import { useReportTrend } from '@/ui/features/report/hooks/useReportTrend';
import { useRetirementPlans } from '@/ui/features/retirement/hooks/useRetirementPlans';

export interface AssetHealthStatus {
  status: 'ahead' | 'on-track' | 'behind';
  assets: { actual: number; projected: number; gapPercent: number };
  income: { actual: number; projected: number; gapPercent: number };
  expense: { actual: number; gapPercent: number; projected: number };
}

interface UseAssetTrendProps {
  householdId: string | undefined;
}

export function useAssetTrend({ householdId }: UseAssetTrendProps) {
  const [rawTrendData, setRawTrendData] = useState<TrendDataPoint[]>([]);
  const [activePlan, setActivePlan] = useState<RetirementPlan | null>(null);

  const [internalLoading, setLoading] = useState(false);
  const [internalError, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<AssetTrendViewMode>('month');

  const trendData = useMemo<AssetTrendData>(() => {
    return aggregateTrendPoints(rawTrendData, viewMode);
  }, [rawTrendData, viewMode]);

  const { getTrendData, loading: trendLoading, error: trendError } = useReportTrend(householdId);
  const { listPlans } = useRetirementPlans(householdId);

  const loadData = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    try {
      const [trendPoints, plans] = await Promise.all([
        getTrendData(),
        listPlans(), // Use the hook's method
      ]);

      setRawTrendData(trendPoints);

      const active = plans.find((p) => p.isActive) || null;
      setActivePlan(active);
      setError(null);
    } catch (err) {
      console.error('Failed to load asset trend data:', err);
      setError('無法載入資產趨勢，請稍後再試');
    } finally {
      setLoading(false);
    }
  }, [householdId, getTrendData, listPlans]);

  const loading = trendLoading || internalLoading;
  const error = trendError || internalError;

  useEffect(() => {
    loadData();
  }, [loadData]);

  const healthStatus = useMemo<AssetHealthStatus | null>(() => {
    if (!activePlan || rawTrendData.length === 0) return null;

    const currentYear = new Date().getFullYear();
    const currentYearPoints = rawTrendData.filter((p) => p.year === currentYear);

    if (currentYearPoints.length === 0) return null;

    // Actuals
    let actualIncome = 0;
    let actualExpense = 0;
    let actualAssets = 0;

    // Sum valid points
    let validMonthsCount = 0;
    currentYearPoints.forEach((p) => {
      // Only count months that have income/expense reported
      if (p.income !== null || p.expense !== null) {
        actualIncome += p.income || 0;
        actualExpense += p.expense || 0;
        validMonthsCount++;
      }
      if (p.totalAssets !== null) {
        actualAssets = p.totalAssets; // taking the latest available as they are sorted
      }
    });

    if (validMonthsCount === 0 && actualAssets === 0) return null;

    // Projected
    const planToProject = JSON.parse(JSON.stringify(activePlan)) as typeof activePlan;
    // No longer update planned income sources as they have been deprecated
    // and replaced with derived income calculation mode

    const projection = getYearlyProjection(planToProject, currentYear);
    const prorateFactor = validMonthsCount > 0 ? validMonthsCount / 12 : 1;

    const projectedIncome = projection.projectedIncome * prorateFactor;
    const projectedExpense = projection.projectedExpense * prorateFactor;

    // For assets, we might want to interpolate or just take end of year.
    // The previous end of year assets vs this year target.
    // Let's proportionally target between last year actual and this year target.
    const lastYearAssets =
      rawTrendData.find((p) => p.year === currentYear - 1 && p.month === 12)?.totalAssets ||
      activePlan.currentSavings;
    const assetsGrowthTarget = projection.projectedAssets - lastYearAssets;
    const projectedAssets = lastYearAssets + assetsGrowthTarget; // total assets at the end of the year

    // Gaps
    const calcGap = (actual: number, proj: number) =>
      proj === 0 ? 0 : ((actual - proj) / proj) * 100;

    const incomeGap = calcGap(actualIncome, projectedIncome);
    const expenseGap = calcGap(actualExpense, projectedExpense);
    const assetsGap = calcGap(actualAssets, projectedAssets);

    // Score:
    // income > projected => ahead (+1)
    // expense < projected => ahead (+1)
    // assets > projected => ahead (+1)

    let score = 0;
    if (incomeGap > 10) score += 1;
    if (incomeGap < -10) score -= 1;

    if (expenseGap < -10) score += 1;
    if (expenseGap > 10) score -= 1;

    if (assetsGap > 10) score += 1;
    if (assetsGap < -10) score -= 1;

    let status: AssetHealthStatus['status'] = 'on-track';
    if (score >= 1) status = 'ahead';
    if (score <= -1) status = 'behind';

    return {
      status,
      assets: { actual: actualAssets, projected: projectedAssets, gapPercent: assetsGap },
      income: { actual: actualIncome, projected: projectedIncome, gapPercent: incomeGap },
      expense: { actual: actualExpense, projected: projectedExpense, gapPercent: expenseGap },
    };
  }, [activePlan, rawTrendData]);

  return {
    rawTrendData,
    trendData,
    activePlan,
    healthStatus,
    loading,
    error,
    viewMode,
    setViewMode,
    reload: loadData,
  };
}
