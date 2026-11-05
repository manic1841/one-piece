import {
  type AnalysisRange,
  type FinancialAnalysis,
  type FinancialAnalysisKpis,
} from '@/application/report/use_cases/getFinancialAnalysisWorkflow';
import { type MoneyTone } from '@/ui/components/moneyTone';
import {
  ANALYSIS_ANCHORS,
  ANALYSIS_PATH,
  ANALYSIS_RANGE_LABELS,
  REPORT_ANALYSIS_LABELS,
  REPORT_SUMMARY_LABELS,
} from '@/ui/constants/report/reportCenterLabels';
import { formatCurrency, formatPercentage } from '@/ui/utils';
import { formatMonthLabel } from '@/ui/utils/date';

import { formatReportPeriodDisplay, parseReportPeriod } from './reportHistory.vm';

export { ANALYSIS_RANGES } from '@/application/report/use_cases/getFinancialAnalysisWorkflow';
export type { AnalysisRange };

export const DEFAULT_RANGE: AnalysisRange = '3y';

export type NetWorthSeriesKey = 'netWorth' | 'assets' | 'liabilities';
export type AssetCompositionSeriesKey = 'cash' | 'investment' | 'property';
export type InvestmentPerformanceSeriesKey = 'gain' | 'returnRate';
export type IncomeSeriesKey = 'income' | 'expense' | 'savingsRate';
export type DebtLeverageSeriesKey = 'liabilities' | 'debtRatio' | 'leverage';
export type SummaryKpiKey = 'totalAssets' | 'netWorth' | 'totalLiabilities' | 'savingsRate';
/** `?series=` values: the two context lines the KPI links preselect. */
export type SeriesParam = 'assets' | 'debt';

export interface SummaryKpiVM {
  key: SummaryKpiKey;
  label: string;
  valueText: string;
  tone: MoneyTone;
  href: string;
  ariaLabel: string;
}

export interface ReportSummaryVM {
  kpis: SummaryKpiVM[];
  periodText: string;
  unclosed: boolean;
}

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
  debtRatio: number;
  leverage: number | null;
  liabilitiesText: string;
  debtRatioText: string;
  leverageText: string;
}

export interface IncomeChartVM extends AnalysisPointTextVM {
  income: number;
  expense: number;
  savingsRate: number | null;
  incomeText: string;
  expenseText: string;
  savingsRateText: string;
}

export interface CashFlowChartVM extends AnalysisPointTextVM {
  netCashFlow: number;
  netCashFlowText: string;
}

export interface ReportAnalysisVM {
  description: string;
  range: AnalysisRange;
  rangeItems: { id: AnalysisRange; label: string }[];
  showRangeControl: boolean;
  indexItems: { id: string; label: string }[];
  unclosedNote: { text: string; showHistoryLink: boolean } | null;
  netWorth: { points: NetWorthChartVM[]; insufficient: boolean; latestText: string | null };
  assetComposition: {
    points: AssetCompositionChartVM[];
    insufficient: boolean;
    latestText: string | null;
  };
  investmentPerformance: {
    points: InvestmentPerformanceChartVM[];
    insufficient: boolean;
    latestText: string | null;
  };
  income: { points: IncomeChartVM[]; insufficient: boolean; latestText: string | null };
  cashFlow: { points: CashFlowChartVM[]; insufficient: boolean; latestText: string | null };
  debtLeverage: {
    points: DebtLeverageChartVM[];
    insufficient: boolean;
    latestText: string | null;
    showLeverage: boolean;
  };
}

const DASH = REPORT_SUMMARY_LABELS.MISSING;

const periodTextOf = (yearMonth: string | null): string => {
  if (yearMonth === null) return DASH;
  const period = parseReportPeriod(yearMonth);
  return period === null ? yearMonth : formatReportPeriodDisplay(period);
};

const percentText = (value: number | null): string =>
  value === null ? DASH : formatPercentage(value, 1);

const kpiValue = (value: number | null): string => (value === null ? DASH : formatCurrency(value));

const analysisHref = (anchor: string, series?: SeriesParam): string =>
  `${ANALYSIS_PATH}${series === undefined ? '' : `?series=${series}`}#${anchor}`;

const summaryKpi = (
  key: SummaryKpiKey,
  label: string,
  valueText: string,
  href: string,
  ariaLabel: string,
  tone: MoneyTone = 'default',
): SummaryKpiVM => ({ key, label, valueText, tone, href, ariaLabel });

/** Landing KPI: four figures from the anchor, each a deep link into the analysis. */
export const buildReportSummaryVM = (analysis: FinancialAnalysis): ReportSummaryVM => {
  const kpis: FinancialAnalysisKpis = analysis.kpis;
  return {
    periodText: periodTextOf(kpis.yearMonth),
    unclosed: kpis.anchorClosed === false,
    kpis: [
      summaryKpi(
        'totalAssets',
        REPORT_SUMMARY_LABELS.TOTAL_ASSETS,
        kpiValue(kpis.assets),
        analysisHref(ANALYSIS_ANCHORS.NET_WORTH, 'assets'),
        REPORT_SUMMARY_LABELS.ARIA_TOTAL_ASSETS,
      ),
      summaryKpi(
        'netWorth',
        REPORT_SUMMARY_LABELS.NET_WORTH,
        kpiValue(kpis.netWorth),
        analysisHref(ANALYSIS_ANCHORS.NET_WORTH),
        REPORT_SUMMARY_LABELS.ARIA_NET_WORTH,
      ),
      summaryKpi(
        'totalLiabilities',
        REPORT_SUMMARY_LABELS.TOTAL_LIABILITIES,
        kpiValue(kpis.liabilities),
        analysisHref(ANALYSIS_ANCHORS.NET_WORTH, 'debt'),
        REPORT_SUMMARY_LABELS.ARIA_TOTAL_LIABILITIES,
      ),
      summaryKpi(
        'savingsRate',
        REPORT_SUMMARY_LABELS.SAVINGS_RATE,
        percentText(kpis.savingsRate),
        analysisHref(ANALYSIS_ANCHORS.INCOME),
        REPORT_SUMMARY_LABELS.ARIA_SAVINGS_RATE,
        kpis.savingsRate !== null && kpis.savingsRate < 0 ? 'negative' : 'default',
      ),
    ],
  };
};

const pointLabel = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-').map(Number);
  return formatMonthLabel(year, month);
};

export const buildReportAnalysisVM = (analysis: FinancialAnalysis): ReportAnalysisVM => {
  const netWorthPoints = analysis.netWorthPoints.map<NetWorthChartVM>((point) => ({
    label: pointLabel(point.yearMonth),
    yearMonth: point.yearMonth,
    unclosed: !point.closed,
    netWorth: point.netWorth,
    assets: point.assets,
    liabilities: point.liabilities,
    netWorthText: formatCurrency(point.netWorth),
    assetsText: formatCurrency(point.assets),
    liabilitiesText: formatCurrency(point.liabilities),
  }));
  const incomePoints = analysis.incomePoints.map<IncomeChartVM>((point) => ({
    label: pointLabel(point.yearMonth),
    yearMonth: point.yearMonth,
    unclosed: !point.closed,
    income: point.income,
    expense: point.expense,
    savingsRate: point.savingsRate,
    incomeText: formatCurrency(point.income),
    expenseText: formatCurrency(point.expense),
    savingsRateText: percentText(point.savingsRate),
  }));
  const assetCompositionPoints = analysis.assetCompositionPoints.map<AssetCompositionChartVM>(
    (point) => {
      const share = (value: number) => (value / point.assetsTotal) * 100;
      return {
        label: pointLabel(point.yearMonth),
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
    },
  );
  const investmentPerformancePoints =
    analysis.investmentPerformancePoints.map<InvestmentPerformanceChartVM>((point) => ({
      label: pointLabel(point.yearMonth),
      yearMonth: point.yearMonth,
      unclosed: !point.closed,
      gain: point.gain,
      openingValue: point.openingValue,
      returnRate: point.returnRate,
      gainText: formatCurrency(point.gain),
      openingValueText: formatCurrency(point.openingValue),
      returnRateText: percentText(point.returnRate),
    }));
  const debtLeveragePoints = analysis.debtLeveragePoints.map<DebtLeverageChartVM>((point) => ({
    label: pointLabel(point.yearMonth),
    yearMonth: point.yearMonth,
    unclosed: !point.closed,
    liabilities: point.liabilities,
    assetsTotal: point.assetsTotal,
    debtRatio: point.debtRatio,
    leverage: point.leverage,
    liabilitiesText: formatCurrency(point.liabilities),
    debtRatioText: formatPercentage(point.debtRatio, 1),
    leverageText: point.leverage === null ? DASH : `${point.leverage.toFixed(2)}x`,
  }));
  const cashFlowPoints = analysis.cashFlowPoints.map<CashFlowChartVM>((point) => ({
    label: pointLabel(point.yearMonth),
    yearMonth: point.yearMonth,
    unclosed: !point.closed,
    netCashFlow: point.netCashFlow,
    netCashFlowText: formatCurrency(point.netCashFlow),
  }));

  // Section headers name the anchor period so the bare value cannot be misread.
  const latestTextAtAnchor = <T extends { yearMonth: string }>(
    points: T[],
    value: (point: T) => string,
  ): string | null => {
    const point =
      analysis.anchor === null
        ? undefined
        : points.find((p) => p.yearMonth === analysis.anchor?.yearMonth);
    return point === undefined ? null : `${point.yearMonth} · ${value(point)}`;
  };

  const unclosed = analysis.unclosedMonths;
  const unclosedNote =
    unclosed.length === 0
      ? null
      : {
          // The description already says the count, so the note only names the months.
          text:
            unclosed.length > 6
              ? REPORT_ANALYSIS_LABELS.UNCLOSED_OVERFLOW_SUFFIX(unclosed[0], unclosed.length)
              : unclosed.join('、'),
          showHistoryLink: unclosed.length > 6,
        };

  return {
    description:
      analysis.anchor === null
        ? REPORT_ANALYSIS_LABELS.EMPTY_DESCRIPTION
        : REPORT_ANALYSIS_LABELS.DESCRIPTION(analysis.anchor.yearMonth, unclosed.length),
    range: analysis.range,
    rangeItems: analysis.availableRanges.map((range) => ({
      id: range,
      label: ANALYSIS_RANGE_LABELS[range],
    })),
    showRangeControl: analysis.availableRanges.length > 1,
    indexItems: [
      { id: ANALYSIS_ANCHORS.NET_WORTH, label: REPORT_ANALYSIS_LABELS.NET_WORTH_SECTION },
      {
        id: ANALYSIS_ANCHORS.ASSET_COMPOSITION,
        label: REPORT_ANALYSIS_LABELS.ASSET_COMPOSITION_SECTION,
      },
      {
        id: ANALYSIS_ANCHORS.INVESTMENT_PERFORMANCE,
        label: REPORT_ANALYSIS_LABELS.INVESTMENT_PERFORMANCE_SECTION,
      },
      { id: ANALYSIS_ANCHORS.INCOME, label: REPORT_ANALYSIS_LABELS.INCOME_SECTION },
      { id: ANALYSIS_ANCHORS.CASH_FLOW, label: REPORT_ANALYSIS_LABELS.CASH_FLOW_SECTION },
      { id: ANALYSIS_ANCHORS.DEBT_LEVERAGE, label: REPORT_ANALYSIS_LABELS.DEBT_LEVERAGE_SECTION },
    ],
    unclosedNote,
    netWorth: {
      points: netWorthPoints,
      insufficient: netWorthPoints.length < 2,
      latestText: latestTextAtAnchor(netWorthPoints, (point) => point.netWorthText),
    },
    assetComposition: {
      points: assetCompositionPoints,
      insufficient: assetCompositionPoints.length < 2,
      latestText: latestTextAtAnchor(
        assetCompositionPoints,
        (point) => `${REPORT_ANALYSIS_LABELS.TOTAL_ASSETS} ${formatCurrency(point.assetsTotal)}`,
      ),
    },
    investmentPerformance: {
      points: investmentPerformancePoints,
      insufficient: investmentPerformancePoints.length < 2,
      latestText: latestTextAtAnchor(
        investmentPerformancePoints,
        (point) => `${REPORT_ANALYSIS_LABELS.RETURN_RATE} ${point.returnRateText}`,
      ),
    },
    income: {
      points: incomePoints,
      insufficient: incomePoints.length < 2,
      latestText: latestTextAtAnchor(incomePoints, (point) => point.savingsRateText),
    },
    cashFlow: {
      points: cashFlowPoints,
      insufficient: cashFlowPoints.length < 2,
      latestText: latestTextAtAnchor(cashFlowPoints, (point) => point.netCashFlowText),
    },
    debtLeverage: {
      points: debtLeveragePoints,
      insufficient: debtLeveragePoints.length < 2,
      latestText: latestTextAtAnchor(
        debtLeveragePoints,
        (point) => `${REPORT_ANALYSIS_LABELS.DEBT_RATIO} ${point.debtRatioText}`,
      ),
      showLeverage: debtLeveragePoints.some(
        (point) => point.leverage !== null && point.leverage > 1,
      ),
    },
  };
};
