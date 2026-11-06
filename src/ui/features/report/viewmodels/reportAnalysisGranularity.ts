import {
  REPORT_ANALYSIS_LABELS,
  REPORT_SUMMARY_LABELS,
} from '@/ui/constants/report/reportCenterLabels';
import { formatCurrency, formatPercentage } from '@/ui/utils';

import {
  type AnalysisGranularity,
  type AssetCompositionChartVM,
  type CashCoverageChartVM,
  type CashFlowChartVM,
  type DebtLeverageChartVM,
  type IncomeChartVM,
  type InvestmentPerformanceChartVM,
  type NetWorthChartVM,
} from './reportAnalysis.vm';

interface PeriodPoint {
  label: string;
  yearMonth: string;
  unclosed: boolean;
}

export interface MonthlyPoints {
  netWorth: NetWorthChartVM[];
  income: IncomeChartVM[];
  assetComposition: AssetCompositionChartVM[];
  investmentPerformance: InvestmentPerformanceChartVM[];
  debtLeverage: DebtLeverageChartVM[];
  cashFlow: CashFlowChartVM[];
  cashCoverage: CashCoverageChartVM[];
}

const percentText = (value: number | null): string =>
  value === null ? REPORT_SUMMARY_LABELS.MISSING : formatPercentage(value, 1);

/** Every point is provisional if any month it covers still is. */
const anyUnclosed = (points: readonly { unclosed: boolean }[]): boolean =>
  points.some((point) => point.unclosed);

export const yearOf = (yearMonth: string): string => yearMonth.slice(0, 4);

const groupByYear = <Point extends PeriodPoint>(points: Point[]): Map<string, Point[]> => {
  const groups = new Map<string, Point[]>();
  for (const point of points) {
    const year = yearOf(point.yearMonth);
    groups.set(year, [...(groups.get(year) ?? []), point]);
  }
  return groups;
};

/** Stock values take the year's last month; the year key carries the provisional flag. */
const annualStock = <Point extends PeriodPoint>(points: Point[]): Point[] =>
  [...groupByYear(points)].map(([year, group]) => ({
    ...(group[group.length - 1] as Point),
    label: year,
    yearMonth: year,
    unclosed: anyUnclosed(group),
  }));

/** Net worth: the last month's stock, plus the change against the previous period. */
export const withChange = (points: NetWorthChartVM[]): NetWorthChartVM[] =>
  points.map((point, index) => {
    const previous = points[index - 1];
    if (previous === undefined || previous.netWorth === 0) return { ...point, changeText: null };
    const delta = point.netWorth - previous.netWorth;
    const rate = (delta / Math.abs(previous.netWorth)) * 100;
    const sign = delta >= 0 ? '+' : '';
    const value = `${sign}${formatCurrency(delta)}（${sign}${formatPercentage(rate, 1)}）`;
    return { ...point, changeText: REPORT_ANALYSIS_LABELS.PREVIOUS_PERIOD(value) };
  });

/** Savings change against the previous period, as an amount. */
export const withSavingsChange = (points: IncomeChartVM[]): IncomeChartVM[] =>
  points.map((point, index) => {
    const previous = points[index - 1];
    if (previous === undefined) return { ...point, changeText: null };
    const delta = point.income - point.expense - (previous.income - previous.expense);
    const sign = delta >= 0 ? '+' : '';
    return {
      ...point,
      changeText: REPORT_ANALYSIS_LABELS.PREVIOUS_PERIOD(`${sign}${formatCurrency(delta)}`),
    };
  });

/** Debt-ratio change is in percentage points, not a growth rate. */
export const withRatioChange = (points: DebtLeverageChartVM[]): DebtLeverageChartVM[] =>
  points.map((point, index) => {
    const previous = points[index - 1];
    if (previous === undefined || previous.debtRatio === null || point.debtRatio === null) {
      return { ...point, changeText: null };
    }
    const delta = point.debtRatio - previous.debtRatio;
    const sign = delta >= 0 ? '+' : '';
    return {
      ...point,
      changeText: REPORT_ANALYSIS_LABELS.PREVIOUS_PERIOD(
        `${sign}${delta.toFixed(1)} ${REPORT_ANALYSIS_LABELS.PERCENTAGE_POINT}`,
      ),
    };
  });

const sumOf = <Point>(points: Point[], value: (point: Point) => number): number =>
  points.reduce((total, point) => total + value(point), 0);

/** Income sums within a year; the rate is recomputed from the yearly totals. */
const annualIncome = (points: IncomeChartVM[]): IncomeChartVM[] =>
  [...groupByYear(points)].map(([year, group]) => {
    const income = sumOf(group, (point) => point.income);
    const expense = sumOf(group, (point) => point.expense);
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : null;
    return {
      label: year,
      yearMonth: year,
      unclosed: anyUnclosed(group),
      income,
      expense,
      savingsRate,
      changeText: null,
      incomeText: formatCurrency(income),
      expenseText: formatCurrency(expense),
      savingsRateText: percentText(savingsRate),
    };
  });

const annualCashFlow = (points: CashFlowChartVM[]): CashFlowChartVM[] =>
  [...groupByYear(points)].map(([year, group]) => {
    const netCashFlow = sumOf(group, (point) => point.netCashFlow);
    return {
      label: year,
      yearMonth: year,
      unclosed: anyUnclosed(group),
      netCashFlow,
      netCashFlowText: formatCurrency(netCashFlow),
    };
  });

/**
 * Investment performance sums the year's gains against the year's first opening
 * value, so the rate stays the household return on the capital it started with.
 */
const annualInvestment = (points: InvestmentPerformanceChartVM[]): InvestmentPerformanceChartVM[] =>
  [...groupByYear(points)].map(([year, group]) => {
    const gain = sumOf(group, (point) => point.gain);
    const openingValue = group[0]?.openingValue ?? 0;
    const returnRate = openingValue > 0 ? (gain / openingValue) * 100 : null;
    return {
      label: year,
      yearMonth: year,
      unclosed: anyUnclosed(group),
      gain,
      openingValue,
      returnRate,
      gainText: formatCurrency(gain),
      openingValueText: formatCurrency(openingValue),
      returnRateText: percentText(returnRate),
    };
  });

/** Switch the monthly series to the annual scale; stock series keep the year's last month. */
export const applyGranularity = (
  monthly: MonthlyPoints,
  granularity: AnalysisGranularity,
): MonthlyPoints =>
  granularity === 'monthly'
    ? monthly
    : {
        netWorth: annualStock(monthly.netWorth),
        income: annualIncome(monthly.income),
        assetComposition: annualStock(monthly.assetComposition),
        investmentPerformance: annualInvestment(monthly.investmentPerformance),
        debtLeverage: annualStock(monthly.debtLeverage),
        cashFlow: annualCashFlow(monthly.cashFlow),
        cashCoverage: annualStock(monthly.cashCoverage),
      };
