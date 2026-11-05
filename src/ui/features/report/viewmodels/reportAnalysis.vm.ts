import {
  type AnalysisRange,
  type FinancialAnalysis,
  type FinancialAnalysisKpis,
} from '@/application/report/use_cases/getFinancialAnalysisUseCase';
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

export type { AnalysisRange };

export type NetWorthSeriesKey = 'netWorth' | 'assets' | 'liabilities';
export type IncomeSeriesKey = 'income' | 'expense' | 'savingsRate';

export interface SummaryKpiVM {
  key: string;
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
  unclosedNote: { text: string; showHistoryLink: boolean } | null;
  netWorth: { points: NetWorthChartVM[]; insufficient: boolean; latestText: string | null };
  income: { points: IncomeChartVM[]; insufficient: boolean; latestText: string | null };
  cashFlow: { points: CashFlowChartVM[]; insufficient: boolean; latestText: string | null };
}

const DASH = REPORT_SUMMARY_LABELS.MISSING;

const periodTextOf = (yearMonth: string | null): string => {
  if (yearMonth === null) return DASH;
  const period = parseReportPeriod(yearMonth);
  return period === null ? yearMonth : formatReportPeriodDisplay(period);
};

const savingsRateText = (value: number | null): string =>
  value === null ? REPORT_ANALYSIS_LABELS.DASH : formatPercentage(value, 1);

const kpiValue = (value: number | null): string =>
  value === null ? DASH : formatCurrency(value);

const analysisHref = (anchor: string, series?: string): string =>
  `${ANALYSIS_PATH}${series === undefined ? '' : `?series=${series}`}#${anchor}`;

const summaryKpi = (
  key: string,
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
        savingsRateText(kpis.savingsRate),
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
    savingsRateText: savingsRateText(point.savingsRate),
  }));
  const cashFlowPoints = analysis.cashFlowPoints.map<CashFlowChartVM>((point) => ({
    label: pointLabel(point.yearMonth),
    yearMonth: point.yearMonth,
    unclosed: !point.closed,
    netCashFlow: point.netCashFlow,
    netCashFlowText: formatCurrency(point.netCashFlow),
  }));

  // Section headers show the anchor period; a block without a report at the anchor shows none.
  const atAnchor = <T extends { yearMonth: string }>(points: T[]): T | undefined =>
    analysis.anchor === null ? undefined : points.find((p) => p.yearMonth === analysis.anchor?.yearMonth);

  const unclosed = analysis.unclosedMonths;
  const unclosedNote =
    unclosed.length === 0
      ? null
      : {
          text:
            unclosed.length > 6
              ? `${REPORT_ANALYSIS_LABELS.UNCLOSED_NOTE_PREFIX}${REPORT_ANALYSIS_LABELS.UNCLOSED_OVERFLOW_SUFFIX(unclosed[0], unclosed.length)}`
              : `${REPORT_ANALYSIS_LABELS.UNCLOSED_NOTE_PREFIX}${unclosed.join('、')}`,
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
    unclosedNote,
    netWorth: {
      points: netWorthPoints,
      insufficient: netWorthPoints.length < 2,
      latestText: atAnchor(netWorthPoints)?.netWorthText ?? null,
    },
    income: {
      points: incomePoints,
      insufficient: incomePoints.length < 2,
      latestText: atAnchor(incomePoints)?.savingsRateText ?? null,
    },
    cashFlow: {
      points: cashFlowPoints,
      insufficient: cashFlowPoints.length < 2,
      latestText: atAnchor(cashFlowPoints)?.netCashFlowText ?? null,
    },
  };
};

/** First index of every contiguous unclosed run, for the chart's warning markers. */
export const unclosedRunStarts = (points: readonly { unclosed: boolean }[]): number[] =>
  points.flatMap((point, index) => {
    if (!point.unclosed) return [];
    return index === 0 || !points[index - 1]?.unclosed ? [index] : [];
  });
