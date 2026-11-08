import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';
import { type MonthTrendSeries, toMonthTrendSeries } from '@/ui/components/charts/monthTrendSeries';
import { formatCurrency, formatPercentage, formatYearMonth } from '@/ui/utils';
import { formatMonthLabel } from '@/ui/utils/date';

import { type HoldingsAllocationVM, buildPortfolioAllocationVM } from './holdingsAllocation.vm';
import { EMPTY_TEXT, isPortfolioActive } from './portfolioVm';

export type { Portfolio, PortfolioSnapshot };

const resolveAccountName = (names: Map<string, string>, id: string): string =>
  names.get(id) ?? EMPTY_TEXT;

const toAsOfText = (snapshot: PortfolioSnapshot | null): string | null =>
  snapshot ? formatYearMonth(snapshot.year, snapshot.month) : null;

const toReturnRateText = (value: number | null): string =>
  value === null ? EMPTY_TEXT : formatPercentage(value);

/** 清單列：已格式化的顯示字串，另留 tone 需要的原始報酬率。 */
export interface PortfolioListRowVM {
  id: string;
  name: string;
  securitiesName: string;
  bankName: string;
  valueText: string;
  returnRate: number | null;
  returnRateText: string;
  asOfText: string | null;
  isActive: boolean;
}

export interface PortfolioListOverviewVM {
  /** 總值原始數值，供 M07 補間。 */
  totalValue: number;
  totalValueText: string;
}

export const mapPortfolioToRowVM = (
  portfolio: Portfolio,
  snapshot: PortfolioSnapshot | undefined,
  accountNames: Map<string, string>,
): PortfolioListRowVM => {
  const returnRate = snapshot ? snapshot.performance.cumulativeReturnRate : null;

  return {
    id: portfolio.id,
    name: portfolio.name,
    securitiesName: resolveAccountName(accountNames, portfolio.securitiesAccountId),
    bankName: resolveAccountName(accountNames, portfolio.bankAccountId),
    valueText: formatCurrency(snapshot?.totalValue ?? 0),
    returnRate,
    returnRateText: toReturnRateText(returnRate),
    asOfText: toAsOfText(snapshot ?? null),
    isActive: portfolio.isActive !== false,
  };
};

export const mapPortfoliosToOverviewVM = (
  portfolios: readonly Portfolio[],
  snapshots: Map<string, PortfolioSnapshot>,
): PortfolioListOverviewVM => {
  const totalValue = portfolios.reduce(
    (sum, portfolio) =>
      isPortfolioActive(portfolio) ? sum + (snapshots.get(portfolio.id)?.totalValue ?? 0) : sum,
    0,
  );

  return { totalValue, totalValueText: formatCurrency(totalValue) };
};

/** 報酬拆解：讀快照凍結的 `performance`，不在頁面重算。 */
export interface PortfolioReturnBreakdownVM {
  /** 原始金額，供 M07 補間；無快照時為 0。 */
  previousValue: number;
  currentValue: number;
  investmentCashFlow: number;
  calculatedReturn: number;
  previousValueText: string;
  currentValueText: string;
  investmentCashFlowText: string;
  calculatedReturnText: string;
}

export interface PortfolioPerformanceRowVM {
  id: string;
  dateText: string;
  totalValueText: string;
  returnText: string;
  cumulativeText: string;
  netFlowText: string;
}

export interface PortfolioDetailVM {
  id: string;
  name: string;
  isActive: boolean;
  /** 最新總值原始數值，供 M07 補間。 */
  totalValue: number;
  totalValueText: string;
  asOfText: string | null;
  securitiesName: string;
  bankName: string;
  monthlyReturnText: string;
  cumulativeReturnText: string;
  /** 原始報酬率（百分比數值），供 M07 補間；無快照時為 null。 */
  monthlyReturn: number | null;
  cumulativeReturn: number | null;
  breakdown: PortfolioReturnBreakdownVM;
  trend: MonthTrendSeries;
  performanceRows: PortfolioPerformanceRowVM[];
  allocation: HoldingsAllocationVM;
}

/** 報酬拆解的呈現資料；數值與文字成對產生，呼叫端不必各自 fallback。 */
const toReturnBreakdown = (
  performance: PortfolioSnapshot['performance'] | undefined,
): PortfolioReturnBreakdownVM => {
  const previousValue = performance?.openingValue ?? 0;
  const currentValue = performance?.closingValue ?? 0;
  const investmentCashFlow = performance?.netCashFlow ?? 0;
  const calculatedReturn = performance?.gain ?? 0;

  return {
    previousValue,
    currentValue,
    investmentCashFlow,
    calculatedReturn,
    previousValueText: formatCurrency(previousValue),
    currentValueText: formatCurrency(currentValue),
    investmentCashFlowText: formatCurrency(investmentCashFlow),
    calculatedReturnText: formatCurrency(calculatedReturn),
  };
};

export const mapPortfolioToDetailVM = (
  portfolio: Portfolio,
  snapshots: readonly PortfolioSnapshot[],
  accountNames: Map<string, string>,
): PortfolioDetailVM => {
  const latest = snapshots[0] ?? null;
  const performance = latest?.performance;

  return {
    id: portfolio.id,
    name: portfolio.name,
    isActive: portfolio.isActive !== false,
    totalValue: latest?.totalValue ?? 0,
    totalValueText: formatCurrency(latest?.totalValue ?? 0),
    asOfText: toAsOfText(latest),
    securitiesName: resolveAccountName(accountNames, portfolio.securitiesAccountId),
    bankName: resolveAccountName(accountNames, portfolio.bankAccountId),
    monthlyReturnText: performance ? formatPercentage(performance.returnRate, 2) : EMPTY_TEXT,
    cumulativeReturnText: performance
      ? formatPercentage(performance.cumulativeReturnRate, 2)
      : EMPTY_TEXT,
    monthlyReturn: performance?.returnRate ?? null,
    cumulativeReturn: performance?.cumulativeReturnRate ?? null,
    breakdown: toReturnBreakdown(performance),
    trend: toMonthTrendSeries(
      snapshots.map((snapshot) => ({
        year: snapshot.year,
        month: snapshot.month,
        value: snapshot.totalValue,
      })),
    ),
    performanceRows: snapshots.map((snapshot) => ({
      id: snapshot.id,
      dateText: formatMonthLabel(snapshot.year, snapshot.month),
      totalValueText: formatCurrency(snapshot.totalValue),
      returnText: formatPercentage(snapshot.performance.returnRate, 2),
      cumulativeText: formatPercentage(snapshot.performance.cumulativeReturnRate, 2),
      netFlowText: formatCurrency(snapshot.performance.netCashFlow),
    })),
    allocation: buildPortfolioAllocationVM(latest ?? undefined),
  };
};
