import { useCallback, useEffect, useMemo, useState } from 'react';

import { aggregateTrendPoints } from '@/domains/finance/logic/trendAggregation';
import {
  type AssetTrendData,
  type AssetTrendViewMode,
  type TrendDataPoint,
} from '@/domains/finance/types';
import { getYearlyProjection } from '@/domains/retirement/logic/retirementCalculator';
import { type RetirementPlan } from '@/domains/retirement/types';
import { financialTrendService } from '@/services/financialTrendService';
import { retirementPlanService } from '@/services/retirementPlanService';

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<AssetTrendViewMode>('month');

  const trendData = useMemo<AssetTrendData>(() => {
    return aggregateTrendPoints(rawTrendData, viewMode);
  }, [rawTrendData, viewMode]);

  const loadData = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    try {
      const [trendPoints, plans] = await Promise.all([
        financialTrendService.getTrendData(householdId),
        retirementPlanService.getRetirementPlans(householdId),
      ]);

      setRawTrendData(trendPoints);

      const active = plans.find((p) => p.isActive) || null;
      setActivePlan(active);
      setError(null);
    } catch (err) {
      console.error('Failed to load asset trend data:', err);
      setError('無法載入趨勢數據，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

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
    const prevYearPoints = rawTrendData.filter((p) => p.year === currentYear - 1);
    const prevYearIncomeByCategory = prevYearPoints.reduce(
      (acc, p) => {
        if (p.incomeByCategory) {
          Object.entries(p.incomeByCategory).forEach(([cat, amt]) => {
            acc[cat] = (acc[cat] || 0) + amt;
          });
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const planToProject = JSON.parse(JSON.stringify(activePlan)) as typeof activePlan;
    if (Object.keys(prevYearIncomeByCategory).length > 0) {
      planToProject.incomes.forEach((income) => {
        if (income.importedFrom === 'plannedIncome') {
          const category = income.incomeCategory || 'salary'; // Default to salary if not specified
          const actualAmount = prevYearIncomeByCategory[category] || 0;
          if (actualAmount > 0) {
            income.baseAmount = actualAmount;
            income.startYear = currentYear - 1; // Align growth curve base year
          }
        }
      });
    }

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
