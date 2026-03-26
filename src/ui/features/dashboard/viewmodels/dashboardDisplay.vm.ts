import { type LeverageStats } from '@/application/portfolio/use_cases/getLeverageStatsUseCase';
import { type UnsettledStats } from '@/application/report/use_cases/getUnsettledStatsUseCase';
import { type AssetTrendData } from '@/domains/report/logic/trendAggregation';
import { formatCurrency } from '@/ui/utils';

export interface LeverageStatsCardVM {
  ratio: number;
  ratioText: string;
  totalExposureText: string;
  totalNetValueText: string;
  statusColorClass: string;
  progressColorClass: string;
  progressWidth: number;
}

const EMPTY_LEVERAGE_STATS: LeverageStats = {
  ratio: 0,
  totalExposure: 0,
  totalNetValue: 0,
};

const getStatusColorClass = (ratio: number) => {
  if (ratio <= 1.05) return 'text-green-600';
  if (ratio <= 1.5) return 'text-amber-600';
  return 'text-red-600';
};

const getProgressColorClass = (ratio: number) => {
  if (ratio <= 1.05) return 'bg-green-500';
  if (ratio <= 1.5) return 'bg-amber-500';
  return 'bg-red-500';
};

export const mapLeverageStatsToCardVM = (stats: LeverageStats | null): LeverageStatsCardVM => {
  const base = stats ?? EMPTY_LEVERAGE_STATS;
  const ratio = base.ratio;

  return {
    ratio,
    ratioText: `${ratio.toFixed(2)}x`,
    totalExposureText: formatCurrency(base.totalExposure),
    totalNetValueText: formatCurrency(base.totalNetValue),
    statusColorClass: getStatusColorClass(ratio),
    progressColorClass: getProgressColorClass(ratio),
    progressWidth: Math.min((ratio / 2) * 100, 100),
  };
};

export interface DebtSummaryCardVM {
  totalDebtText: string;
  monthlyPaymentText: string;
  unpaidCountText: string;
  unpaidUnitText: string;
  unpaidContainerClassName: string;
  unpaidIconClassName: string;
  unpaidLabelClassName: string;
  unpaidCountClassName: string;
  unpaidUnitClassName: string;
  isUnpaid: boolean;
}

export const mapDebtSummaryToCardVM = (
  totalDebt: number,
  monthlyPaymentTotal: number,
  unpaidCount: number,
): DebtSummaryCardVM => {
  const isUnpaid = unpaidCount > 0;

  return {
    totalDebtText: formatCurrency(Math.round(totalDebt)),
    monthlyPaymentText: formatCurrency(Math.round(monthlyPaymentTotal)),
    unpaidCountText: String(unpaidCount),
    unpaidUnitText: '筆',
    unpaidContainerClassName: isUnpaid
      ? 'bg-rose-50 border-rose-100'
      : 'bg-emerald-50 border-emerald-100',
    unpaidIconClassName: isUnpaid ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600',
    unpaidLabelClassName: isUnpaid ? 'text-rose-600' : 'text-emerald-600',
    unpaidCountClassName: isUnpaid ? 'text-rose-700' : 'text-emerald-700',
    unpaidUnitClassName: isUnpaid ? 'text-rose-500' : 'text-emerald-500',
    isUnpaid,
  };
};

export type AssetHealthStatusType = 'ahead' | 'on-track' | 'behind';

export interface AssetTrendStatusBadgeVM {
  label: string;
  icon: AssetHealthStatusType;
  iconClassName: string;
}

export const mapAssetTrendStatusToBadgeVM = (
  status: AssetHealthStatusType,
): AssetTrendStatusBadgeVM => {
  if (status === 'ahead') {
    return { label: '進度超前', icon: 'ahead', iconClassName: 'text-emerald-500' };
  }

  if (status === 'on-track') {
    return { label: '符合預期', icon: 'on-track', iconClassName: 'text-blue-500' };
  }

  return { label: '稍微落後', icon: 'behind', iconClassName: 'text-rose-500' };
};

export interface AssetTrendMetricVM {
  label: string;
  actualText: string;
  projectedText: string;
  gapText: string;
  gapBadgeClassName: string;
}

export const mapAssetTrendMetricToVM = (
  label: string,
  actual: number,
  projected: number,
  gapPercent: number,
  invertGoodMode = false,
): AssetTrendMetricVM => {
  const isGood = invertGoodMode ? gapPercent <= 0 : gapPercent >= 0;
  const sign = gapPercent > 0 ? '+' : '';
  const colorClass = isGood ? 'text-emerald-600' : 'text-rose-600';
  const bgClass = isGood ? 'bg-emerald-100' : 'bg-rose-100';

  return {
    label,
    actualText: formatCurrency(Math.round(actual)),
    projectedText: `預測 ${formatCurrency(Math.round(projected))}`,
    gapText: `${sign}${gapPercent.toFixed(1)}% ${isGood ? '超前' : '落後'}`,
    gapBadgeClassName: `${bgClass} ${colorClass}`,
  };
};

export interface AssetTrendChartPointVM {
  label: string;
  totalAssets: number;
  income: number;
  expense: number;
  investmentGain: number;
}

export const mapAssetTrendDataToChartPoints = (
  trendData: AssetTrendData | null,
): AssetTrendChartPointVM[] => {
  if (!trendData) return [];

  const points: AssetTrendChartPointVM[] = trendData.labels.map((label, index) => ({
    label,
    totalAssets: trendData.assets[index] ?? 0,
    income: trendData.incomes[index] ?? 0,
    expense: trendData.expenses[index] ?? 0,
    investmentGain: trendData.investmentGains[index] ?? 0,
  }));

  let lastDataIndex = -1;
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    if (p.totalAssets !== 0 || p.income !== 0 || p.expense !== 0 || p.investmentGain !== 0) {
      lastDataIndex = i;
      break;
    }
  }

  if (lastDataIndex === -1) return [];
  return points.slice(0, lastDataIndex + 1);
};

export interface AssetTrendYAxisDomainsVM {
  left: [number, number];
  right: [number, number];
}

export const mapAssetTrendYAxisDomains = (
  chartData: AssetTrendChartPointVM[],
  projectedAssets: number,
  projectedIncome: number,
  projectedExpense: number,
): AssetTrendYAxisDomainsVM => {
  const actualAssetsMax = Math.max(...chartData.map((p) => p.totalAssets || 0), 0);
  const rightMax = Math.max(actualAssetsMax, projectedAssets || 0);

  const actualIncomeMax = Math.max(...chartData.map((p) => p.income || 0), 0);
  const actualExpenseMax = Math.max(...chartData.map((p) => p.expense || 0), 0);
  const leftMax = Math.max(
    actualIncomeMax,
    actualExpenseMax,
    projectedIncome || 0,
    projectedExpense || 0,
  );

  return {
    left: [0, Math.ceil(leftMax * 1.1)],
    right: [0, Math.ceil(rightMax * 1.1)],
  };
};

export const formatCompactAxisValue = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return String(value);
};

export const formatTrendTooltipValue = (value: number) => formatCurrency(value);

export interface UnsettledStatsCardSectionVM {
  countText: string;
  countClassName: string;
  progressWidth: number;
}

export interface UnsettledStatsCardVM {
  titleText: string;
  isFullySettled: boolean;
  totalBadgeText: string;
  statusIconType: 'settled' | 'unsettled';
  statusIconContainerClassName: string;
  statusIconClassName: string;
  badgeVariant: 'outline' | 'destructive';
  accounts: UnsettledStatsCardSectionVM;
  portfolios: UnsettledStatsCardSectionVM;
  projects: UnsettledStatsCardSectionVM;
}

const mapCountToSectionVM = (count: number): UnsettledStatsCardSectionVM => ({
  countText: String(count),
  countClassName: count > 0 ? 'text-amber-600' : 'text-slate-400',
  progressWidth: count > 0 ? 100 : 0,
});

const buildEmptyUnsettledStats = (): UnsettledStats => {
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
};

export const mapUnsettledStatsToCardVM = (stats: UnsettledStats | null): UnsettledStatsCardVM => {
  const base = stats ?? buildEmptyUnsettledStats();
  const isFullySettled = base.totalUnsettled === 0;

  return {
    titleText: `結算 (${base.year}/${base.month})`,
    isFullySettled,
    totalBadgeText: isFullySettled ? '已全部結算' : `${base.totalUnsettled} 項未結算`,
    statusIconType: isFullySettled ? 'settled' : 'unsettled',
    statusIconContainerClassName: isFullySettled ? 'bg-green-100' : 'bg-amber-100',
    statusIconClassName: isFullySettled ? 'text-green-600' : 'text-amber-600',
    badgeVariant: isFullySettled ? 'outline' : 'destructive',
    accounts: mapCountToSectionVM(base.unsettledAccounts.length),
    portfolios: mapCountToSectionVM(base.unsettledPortfolios.length),
    projects: mapCountToSectionVM(base.unsettledProjects.length),
  };
};
