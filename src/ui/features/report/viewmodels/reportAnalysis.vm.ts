import { type FinancialAnalysis } from '@/application/report/use_cases/getFinancialAnalysisWorkflow';
import {
  ANALYSIS_GRANULARITIES,
  ANALYSIS_RANGES,
  type AnalysisGranularity,
  type AnalysisRange,
  yearOf,
} from '@/domains/report/analysisScale';
import {
  ANALYSIS_RANGE_LABELS,
  REPORT_ANALYSIS_LABELS,
  REPORT_SUMMARY_LABELS,
} from '@/ui/constants/report/reportCenterLabels';
import { formatCurrency, formatPercentage, formatPercentageOrDash } from '@/ui/utils';
import { formatMonthLabel } from '@/ui/utils/date';

import { withChange, withRatioChange, withSavingsChange } from './reportAnalysisChange';
import { type TakeawayVM, takeawayOf } from './reportAnalysisTakeaway';

export { ANALYSIS_GRANULARITIES, ANALYSIS_RANGES };
export type { AnalysisGranularity, AnalysisRange };

export const DEFAULT_RANGE: AnalysisRange = '3y';

export const DEFAULT_GRANULARITY: AnalysisGranularity = 'monthly';

export type NetWorthSeriesKey = 'netWorth' | 'assets' | 'liabilities';
export type AssetCompositionSeriesKey = 'cash' | 'investment' | 'property';
export type InvestmentPerformanceSeriesKey = 'gain' | 'returnRate';
export type IncomeSeriesKey = 'income' | 'expense' | 'savingsRate';
export type DebtLeverageSeriesKey = 'liabilities' | 'debtRatio' | 'leverage';
/** `?series=` values: the two context lines the KPI links preselect. */
export type SeriesParam = 'assets' | 'debt';

export interface AnalysisPointTextVM {
  label: string;
  yearMonth: string;
  /** The month was not closed when the analysis was assembled. */
  unclosed: boolean;
}

export interface NetWorthChartVM extends AnalysisPointTextVM {
  netWorth: number;
  assets: number;
  liabilities: number;
  netWorthText: string;
  assetsText: string;
  liabilitiesText: string;
  /** `較前期 <amount>（<rate>）`; null on the first period. */
  changeText: string | null;
}

export interface AssetCompositionChartVM extends AnalysisPointTextVM {
  /** Fixed denominator for every share on the point. */
  assetsTotal: number;
  cash: number;
  investment: number;
  property: number;
  cashText: string;
  investmentText: string;
  propertyText: string;
  cashShare: number;
  investmentShare: number;
  propertyShare: number;
  cashShareText: string;
  investmentShareText: string;
  propertyShareText: string;
}

export interface InvestmentPerformanceChartVM extends AnalysisPointTextVM {
  gain: number;
  openingValue: number;
  returnRate: number | null;
  gainText: string;
  openingValueText: string;
  returnRateText: string;
}

export interface DebtLeverageChartVM extends AnalysisPointTextVM {
  liabilities: number;
  assetsTotal: number;
  debtRatio: number | null;
  leverage: number | null;
  changeText: string | null;
  liabilitiesText: string;
  debtRatioText: string;
  leverageText: string;
}

export interface IncomeChartVM extends AnalysisPointTextVM {
  income: number;
  expense: number;
  savingsRate: number | null;
  changeText: string | null;
  incomeText: string;
  expenseText: string;
  savingsRateText: string;
}

export interface CashFlowChartVM extends AnalysisPointTextVM {
  netCashFlow: number;
  netCashFlowText: string;
}

export interface CashCoverageChartVM extends AnalysisPointTextVM {
  cash: number;
  expenseAverage: number | null;
  coverageMonths: number | null;
  cashText: string;
  expenseAverageText: string;
  coverageMonthsText: string;
}

interface AnalysisSectionVM<Point> {
  points: Point[];
  insufficient: boolean;
  /** `period · value` for the selected period, pinned above the chart. */
  latestText: string | null;
}

export interface SelectionVM {
  /** Resolved period key (`YYYY-MM`, or `YYYY` on the annual scale). */
  periodKey: string;
  periodText: string;
  unclosed: boolean;
  rows: { label: string; value: string }[];
  reportHref: string;
  reportLabel: string;
}

export interface ReportAnalysisVM {
  /** One-line reading of the selected period; the page's answer before its evidence. */
  takeaway: TakeawayVM;
  cutoffText: string;
  range: AnalysisRange;
  rangeItems: { id: AnalysisRange; label: string }[];
  showRangeControl: boolean;
  granularity: AnalysisGranularity;
  granularityItems: { id: AnalysisGranularity; label: string }[];
  showGranularityControl: boolean;
  selection: SelectionVM;
  unclosedNote: { text: string; showHistoryLink: boolean } | null;
  netWorth: AnalysisSectionVM<NetWorthChartVM>;
  assetComposition: AnalysisSectionVM<AssetCompositionChartVM>;
  investmentPerformance: AnalysisSectionVM<InvestmentPerformanceChartVM>;
  income: AnalysisSectionVM<IncomeChartVM>;
  cashFlow: AnalysisSectionVM<CashFlowChartVM>;
  debtLeverage: AnalysisSectionVM<DebtLeverageChartVM> & { showLeverage: boolean };
  cashCoverage: AnalysisSectionVM<CashCoverageChartVM>;
}

const DASH = REPORT_SUMMARY_LABELS.MISSING;

const pointLabel = (yearMonth: string, granularity: AnalysisGranularity): string => {
  if (granularity === 'annual') return yearMonth;
  const [year, month] = yearMonth.split('-').map(Number);
  return formatMonthLabel(year, month);
};

const section = <Point>(points: Point[], latestText: string | null): AnalysisSectionVM<Point> => ({
  points,
  // A single point cannot show a trend.
  insufficient: points.length < 2,
  latestText,
});

/** Chart points: every value arrives pre-formatted so the renderers stay dumb. */
const pointsOf = (analysis: FinancialAnalysis, granularity: AnalysisGranularity) => ({
  netWorth: analysis.netWorthPoints.map<NetWorthChartVM>((point) => ({
    label: pointLabel(point.yearMonth, granularity),
    yearMonth: point.yearMonth,
    unclosed: !point.closed,
    netWorth: point.netWorth,
    assets: point.assets,
    liabilities: point.liabilities,
    netWorthText: formatCurrency(point.netWorth),
    assetsText: formatCurrency(point.assets),
    liabilitiesText: formatCurrency(point.liabilities),
    changeText: null,
  })),
  income: analysis.incomePoints.map<IncomeChartVM>((point) => ({
    label: pointLabel(point.yearMonth, granularity),
    yearMonth: point.yearMonth,
    unclosed: !point.closed,
    income: point.income,
    expense: point.expense,
    savingsRate: point.savingsRate,
    changeText: null,
    incomeText: formatCurrency(point.income),
    expenseText: formatCurrency(point.expense),
    savingsRateText: formatPercentageOrDash(point.savingsRate),
  })),
  assetComposition: analysis.assetCompositionPoints.map<AssetCompositionChartVM>((point) => {
    const share = (value: number) => (value / point.assetsTotal) * 100;
    return {
      label: pointLabel(point.yearMonth, granularity),
      yearMonth: point.yearMonth,
      unclosed: !point.closed,
      assetsTotal: point.assetsTotal,
      cash: point.cash,
      investment: point.investment,
      property: point.property,
      cashText: formatCurrency(point.cash),
      investmentText: formatCurrency(point.investment),
      propertyText: formatCurrency(point.property),
      cashShare: share(point.cash),
      investmentShare: share(point.investment),
      propertyShare: share(point.property),
      cashShareText: formatPercentage(share(point.cash), 1),
      investmentShareText: formatPercentage(share(point.investment), 1),
      propertyShareText: formatPercentage(share(point.property), 1),
    };
  }),
  investmentPerformance: analysis.investmentPerformancePoints.map<InvestmentPerformanceChartVM>(
    (point) => ({
      label: pointLabel(point.yearMonth, granularity),
      yearMonth: point.yearMonth,
      unclosed: !point.closed,
      gain: point.gain,
      openingValue: point.openingValue,
      returnRate: point.returnRate,
      gainText: formatCurrency(point.gain),
      openingValueText: formatCurrency(point.openingValue),
      returnRateText: formatPercentageOrDash(point.returnRate),
    }),
  ),
  debtLeverage: analysis.debtLeveragePoints.map<DebtLeverageChartVM>((point) => ({
    label: pointLabel(point.yearMonth, granularity),
    yearMonth: point.yearMonth,
    unclosed: !point.closed,
    liabilities: point.liabilities,
    assetsTotal: point.assetsTotal,
    debtRatio: point.debtRatio,
    leverage: point.leverage,
    changeText: null,
    liabilitiesText: formatCurrency(point.liabilities),
    debtRatioText: formatPercentageOrDash(point.debtRatio),
    leverageText: point.leverage === null ? DASH : `${Number(point.leverage.toFixed(4))}x`,
  })),
  cashFlow: analysis.cashFlowPoints.map<CashFlowChartVM>((point) => ({
    label: pointLabel(point.yearMonth, granularity),
    yearMonth: point.yearMonth,
    unclosed: !point.closed,
    netCashFlow: point.netCashFlow,
    netCashFlowText: formatCurrency(point.netCashFlow),
  })),
  cashCoverage: analysis.cashCoveragePoints.map<CashCoverageChartVM>((point) => ({
    label: pointLabel(point.yearMonth, granularity),
    yearMonth: point.yearMonth,
    unclosed: !point.closed,
    cash: point.cash,
    expenseAverage: point.expenseAverage,
    coverageMonths: point.coverageMonths,
    cashText: formatCurrency(point.cash),
    expenseAverageText: point.expenseAverage === null ? DASH : formatCurrency(point.expenseAverage),
    coverageMonthsText: point.coverageMonths === null ? DASH : point.coverageMonths.toFixed(1),
  })),
});

export const buildReportAnalysisVM = (
  analysis: FinancialAnalysis,
  granularity: AnalysisGranularity = DEFAULT_GRANULARITY,
  requestedPeriod: string | null = null,
): ReportAnalysisVM => {
  // The analysis already arrives on the requested scale; only its text is built here.
  const scaledAnalysis = pointsOf(analysis, granularity);
  const {
    assetComposition: assetCompositionPoints,
    investmentPerformance: investmentPerformancePoints,
    cashFlow: cashFlowPoints,
    cashCoverage: cashCoveragePoints,
  } = scaledAnalysis;
  const netWorthPoints = withChange(scaledAnalysis.netWorth);
  const incomePoints = withSavingsChange(scaledAnalysis.income);
  const debtLeveragePoints = withRatioChange(scaledAnalysis.debtLeverage);

  const allPoints = [
    ...netWorthPoints,
    ...assetCompositionPoints,
    ...investmentPerformancePoints,
    ...incomePoints,
    ...cashFlowPoints,
    ...debtLeveragePoints,
    ...cashCoveragePoints,
  ];
  const periodKeys = new Set(allPoints.map((point) => point.yearMonth));
  const anchorKey =
    analysis.anchor === null
      ? null
      : granularity === 'annual'
        ? yearOf(analysis.anchor.yearMonth)
        : analysis.anchor.yearMonth;
  // An unknown deep link falls back to the anchor instead of showing nothing.
  const selected =
    requestedPeriod !== null && periodKeys.has(requestedPeriod) ? requestedPeriod : anchorKey;

  // Section headers name the selected period so the bare value cannot be misread;
  // the value is flagged when the period it comes from is still open.
  const valueAt = <T extends { yearMonth: string; unclosed: boolean }>(
    points: T[],
    value: (point: T) => string,
  ): string | null => {
    const point = selected === null ? undefined : points.find((p) => p.yearMonth === selected);
    if (point === undefined) return null;
    const provisional = point.unclosed ? REPORT_ANALYSIS_LABELS.PROVISIONAL_SUFFIX : '';
    return `${point.yearMonth} · ${value(point)}${provisional}`;
  };

  const takeaway = takeawayOf({ netWorthPoints, incomePoints, debtLeveragePoints }, selected);

  const unclosed = analysis.unclosedMonths;
  const unclosedNote =
    unclosed.length === 0
      ? null
      : {
          // The note only names the months; the header carries the cut-off.
          text:
            unclosed.length > 6
              ? REPORT_ANALYSIS_LABELS.UNCLOSED_OVERFLOW_SUFFIX(unclosed[0], unclosed.length)
              : unclosed.join('、'),
          showHistoryLink: unclosed.length > 6,
        };

  const selectedNetWorth =
    selected === null ? undefined : netWorthPoints.find((point) => point.yearMonth === selected);
  const selectedIncome =
    selected === null ? undefined : incomePoints.find((point) => point.yearMonth === selected);
  const selectedDebt =
    selected === null
      ? undefined
      : debtLeveragePoints.find((point) => point.yearMonth === selected);
  const selection: SelectionVM =
    selected === null
      ? {
          periodKey: '',
          periodText: '',
          unclosed: false,
          rows: [],
          reportHref: '',
          reportLabel: '',
        }
      : {
          periodKey: selected,
          periodText: selected,
          unclosed: allPoints.some((point) => point.yearMonth === selected && point.unclosed),
          rows: [
            {
              label: REPORT_ANALYSIS_LABELS.NET_WORTH,
              value: selectedNetWorth?.netWorthText ?? DASH,
            },
            {
              label: REPORT_ANALYSIS_LABELS.TOTAL_ASSETS,
              value: selectedNetWorth?.assetsText ?? DASH,
            },
            {
              label: REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES,
              value: selectedNetWorth?.liabilitiesText ?? DASH,
            },
            {
              label: REPORT_ANALYSIS_LABELS.SAVINGS_RATE,
              value: selectedIncome?.savingsRateText ?? DASH,
            },
            {
              label: REPORT_ANALYSIS_LABELS.DEBT_RATIO,
              value: selectedDebt?.debtRatioText ?? DASH,
            },
          ],
          reportHref: `/reports/${selected}`,
          reportLabel: REPORT_ANALYSIS_LABELS.VIEW_PERIOD_REPORT(selected),
        };

  const years = new Set(allPoints.map((point) => yearOf(point.yearMonth)));

  return {
    takeaway,
    cutoffText:
      analysis.anchor === null ? '' : REPORT_ANALYSIS_LABELS.CUTOFF_AT(analysis.anchor.yearMonth),
    range: analysis.range,
    rangeItems: analysis.availableRanges.map((range) => ({
      id: range,
      label: ANALYSIS_RANGE_LABELS[range],
    })),
    showRangeControl: analysis.availableRanges.length > 1,
    granularity,
    granularityItems: [
      { id: 'monthly', label: REPORT_ANALYSIS_LABELS.GRANULARITY_MONTHLY },
      { id: 'annual', label: REPORT_ANALYSIS_LABELS.GRANULARITY_ANNUAL },
    ],
    // Keep the control reachable when an annual deep link lands on a single year.
    showGranularityControl: years.size > 1 || granularity === 'annual',
    selection,
    unclosedNote,
    netWorth: section(
      netWorthPoints,
      valueAt(netWorthPoints, (point) => point.netWorthText),
    ),
    assetComposition: section(
      assetCompositionPoints,
      valueAt(
        assetCompositionPoints,
        (point) => `${REPORT_ANALYSIS_LABELS.TOTAL_ASSETS} ${formatCurrency(point.assetsTotal)}`,
      ),
    ),
    investmentPerformance: section(
      investmentPerformancePoints,
      valueAt(
        investmentPerformancePoints,
        (point) => `${REPORT_ANALYSIS_LABELS.RETURN_RATE} ${point.returnRateText}`,
      ),
    ),
    income: section(
      incomePoints,
      valueAt(incomePoints, (point) => point.savingsRateText),
    ),
    cashFlow: section(
      cashFlowPoints,
      valueAt(cashFlowPoints, (point) => point.netCashFlowText),
    ),
    debtLeverage: {
      ...section(
        debtLeveragePoints,
        valueAt(
          debtLeveragePoints,
          (point) => `${REPORT_ANALYSIS_LABELS.DEBT_RATIO} ${point.debtRatioText}`,
        ),
      ),
      showLeverage: debtLeveragePoints.some(
        (point) => point.leverage !== null && point.leverage > 1,
      ),
    },
    cashCoverage: {
      ...section(
        cashCoveragePoints,
        valueAt(
          cashCoveragePoints,
          (point) => `${point.coverageMonthsText} ${REPORT_ANALYSIS_LABELS.COVERAGE_MONTHS_UNIT}`,
        ),
      ),
      // The axis keeps months whose window is incomplete; they cannot show a trend.
      insufficient: cashCoveragePoints.filter((point) => point.coverageMonths !== null).length < 2,
    },
  };
};
