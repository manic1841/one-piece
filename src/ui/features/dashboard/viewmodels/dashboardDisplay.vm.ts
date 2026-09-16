import { type LeverageStats } from '@/application/portfolio/use_cases/getLeverageStatsUseCase';
import { type SettlementReadiness } from '@/application/report/use_cases/getSettlementReadinessUseCase';
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
  if (ratio <= 1.05) return 'text-positive';
  if (ratio <= 1.5) return 'text-warning';
  return 'text-negative';
};

const getProgressColorClass = (ratio: number) => {
  if (ratio <= 1.05) return 'bg-positive';
  if (ratio <= 1.5) return 'bg-warning';
  return 'bg-negative';
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
      ? 'bg-negative/10 border-negative/20'
      : 'bg-positive/10 border-positive/20',
    unpaidIconClassName: isUnpaid ? 'bg-negative/15 text-negative' : 'bg-positive/15 text-positive',
    unpaidLabelClassName: isUnpaid ? 'text-negative' : 'text-positive',
    unpaidCountClassName: isUnpaid ? 'text-negative' : 'text-positive',
    unpaidUnitClassName: isUnpaid ? 'text-negative' : 'text-positive',
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
    return { label: '進度超前', icon: 'ahead', iconClassName: 'text-positive' };
  }

  if (status === 'on-track') {
    return { label: '符合預期', icon: 'on-track', iconClassName: 'text-chart-1' };
  }

  return { label: '稍微落後', icon: 'behind', iconClassName: 'text-negative' };
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
  const colorClass = isGood ? 'text-positive' : 'text-negative';
  const bgClass = isGood ? 'bg-positive/10' : 'bg-negative/10';

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
  liabilities: number;
  netAssets: number;
  netAssetsGrowthPct: number | null;
  liabilitiesGrowthPct: number | null;
  income: number;
  expense: number;
  investmentGain: number;
  investmentReturnRate: number | null;
}

export const mapAssetTrendDataToChartPoints = (
  trendData: AssetTrendData | null,
): AssetTrendChartPointVM[] => {
  if (!trendData) return [];

  const points: AssetTrendChartPointVM[] = trendData.labels.map((label, index) => {
    const netAssets = trendData.netAssets[index] ?? 0;
    const liabilities = trendData.liabilities[index] ?? 0;
    const prevNetAssets = index > 0 ? (trendData.netAssets[index - 1] ?? 0) : null;
    const prevLiabilities = index > 0 ? (trendData.liabilities[index - 1] ?? 0) : null;

    const netAssetsGrowthPct =
      prevNetAssets !== null && prevNetAssets !== 0
        ? ((netAssets - prevNetAssets) / Math.abs(prevNetAssets)) * 100
        : null;

    const liabilitiesGrowthPct =
      prevLiabilities !== null && prevLiabilities !== 0
        ? ((liabilities - prevLiabilities) / Math.abs(prevLiabilities)) * 100
        : null;

    return {
      label,
      totalAssets: trendData.assets[index] ?? 0,
      liabilities,
      netAssets,
      netAssetsGrowthPct,
      liabilitiesGrowthPct,
      income: trendData.incomes[index] ?? 0,
      expense: trendData.expenses[index] ?? 0,
      investmentGain: trendData.investmentGains[index] ?? 0,
      investmentReturnRate: trendData.investmentReturnRates[index] ?? null,
    };
  });

  let lastDataIndex = -1;
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    if (
      p.totalAssets !== 0 ||
      p.liabilities !== 0 ||
      p.netAssets !== 0 ||
      p.income !== 0 ||
      p.expense !== 0 ||
      p.investmentGain !== 0
    ) {
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

export const formatTrendTooltipValue = (
  value: number,
  name: string,
  entry: { payload?: AssetTrendChartPointVM; dataKey?: unknown },
): [string, string] => {
  const currency = formatCurrency(value);
  const point = entry?.payload;
  const seriesKey = typeof entry?.dataKey === 'string' ? entry.dataKey : undefined;

  if (seriesKey === 'netAssets' && point?.netAssetsGrowthPct != null) {
    const sign = point.netAssetsGrowthPct >= 0 ? '+' : '';
    return [`${currency} (${sign}${point.netAssetsGrowthPct.toFixed(1)}%)`, name];
  }
  if (seriesKey === 'liabilities' && point?.liabilitiesGrowthPct != null) {
    const sign = point.liabilitiesGrowthPct >= 0 ? '+' : '';
    return [`${currency} (${sign}${point.liabilitiesGrowthPct.toFixed(1)}%)`, name];
  }
  if (seriesKey === 'investmentGain' && point?.investmentReturnRate != null) {
    const sign = point.investmentReturnRate >= 0 ? '+' : '';
    return [`${currency} (${sign}${point.investmentReturnRate.toFixed(2)}%)`, name];
  }
  return [currency, name];
};

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
  countClassName: count > 0 ? 'text-warning' : 'text-muted-foreground',
  progressWidth: count > 0 ? 100 : 0,
});

const buildEmptySettlementReadiness = (): SettlementReadiness => {
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
};

export const mapUnsettledStatsToCardVM = (
  stats: SettlementReadiness | null,
): UnsettledStatsCardVM => {
  const base = stats ?? buildEmptySettlementReadiness();
  const isFullySettled = base.isReady;

  return {
    titleText: `結算 (${base.year}/${base.month})`,
    isFullySettled,
    totalBadgeText: isFullySettled ? '已全部結算' : `${base.totalUnsettled} 項未結算`,
    statusIconType: isFullySettled ? 'settled' : 'unsettled',
    statusIconContainerClassName: isFullySettled ? 'bg-positive/10' : 'bg-warning/10',
    statusIconClassName: isFullySettled ? 'text-positive' : 'text-warning',
    badgeVariant: isFullySettled ? 'outline' : 'destructive',
    accounts: mapCountToSectionVM(base.unsettledAccounts.length),
    portfolios: mapCountToSectionVM(base.unsettledPortfolios.length),
    projects: mapCountToSectionVM(base.unsettledProjects.length),
  };
};
