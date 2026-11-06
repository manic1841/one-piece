import { type FinancialAnalysis } from '@/application/report/use_cases/getFinancialAnalysisWorkflow';
import { type AnalysisGranularity, yearOf } from '@/domains/report/analysisScale';
import {
  REPORT_ANALYSIS_LABELS,
  REPORT_SUMMARY_LABELS,
} from '@/ui/constants/report/reportCenterLabels';

export const MISSING = REPORT_SUMMARY_LABELS.MISSING;

export interface SelectionVM {
  /** Resolved period key (`YYYY-MM`, or `YYYY` on the annual scale). */
  periodKey: string;
  periodText: string;
  unclosed: boolean;
  rows: { label: string; value: string }[];
  reportHref: string;
  reportLabel: string;
}

type PeriodPoint = { yearMonth: string };

/** The anchor on the active scale: a month key, or its year on the annual scale. */
export const anchorKeyOf = (
  analysis: FinancialAnalysis,
  granularity: AnalysisGranularity,
): string | null => {
  if (analysis.anchor === null) return null;
  return granularity === 'annual' ? yearOf(analysis.anchor.yearMonth) : analysis.anchor.yearMonth;
};

/** An unknown deep link falls back to the anchor instead of showing nothing. */
export const resolveSelected = (
  analysis: FinancialAnalysis,
  granularity: AnalysisGranularity,
  requestedPeriod: string | null,
  periodKeys: Set<string>,
): string | null =>
  requestedPeriod !== null && periodKeys.has(requestedPeriod)
    ? requestedPeriod
    : anchorKeyOf(analysis, granularity);

/**
 * A selected year without a net-worth point falls back to the closest earlier
 * net-worth year; the selection rows still follow the actual selection.
 */
export const takeawayAnchorOf = (
  netWorthPoints: PeriodPoint[],
  selected: string | null,
  granularity: AnalysisGranularity,
): string | null => {
  if (granularity !== 'annual' || selected === null) return selected;
  if (netWorthPoints.some((point) => point.yearMonth === selected)) return selected;
  return netWorthPoints.filter((point) => point.yearMonth <= selected).at(-1)?.yearMonth ?? null;
};

/** The cut-off sentence always names how many periods inside it are provisional. */
export const cutoffTextOf = (
  analysis: FinancialAnalysis,
  granularity: AnalysisGranularity,
  unclosedCount: number,
): string => {
  if (analysis.anchor === null) return '';
  const base =
    unclosedCount === 0
      ? REPORT_ANALYSIS_LABELS.CUTOFF_AT(analysis.anchor.yearMonth)
      : REPORT_ANALYSIS_LABELS.CUTOFF_WITH_UNCLOSED(analysis.anchor.yearMonth, unclosedCount);
  return base + (granularity === 'annual' ? REPORT_ANALYSIS_LABELS.MONTH_SCALE_SUFFIX : '');
};

interface SelectionPoints {
  netWorth?: { netWorthText: string; assetsText: string; liabilitiesText: string };
  income?: { savingsRateText: string };
  debt?: { debtRatioText: string };
}

export const buildSelection = (
  selected: string | null,
  points: SelectionPoints,
  unclosed: boolean,
): SelectionVM => {
  if (selected === null) {
    return {
      periodKey: '',
      periodText: '',
      unclosed: false,
      rows: [],
      reportHref: '',
      reportLabel: '',
    };
  }
  return {
    periodKey: selected,
    periodText: selected,
    unclosed,
    rows: [
      { label: REPORT_ANALYSIS_LABELS.NET_WORTH, value: points.netWorth?.netWorthText ?? MISSING },
      { label: REPORT_ANALYSIS_LABELS.TOTAL_ASSETS, value: points.netWorth?.assetsText ?? MISSING },
      {
        label: REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES,
        value: points.netWorth?.liabilitiesText ?? MISSING,
      },
      {
        label: REPORT_ANALYSIS_LABELS.SAVINGS_RATE,
        value: points.income?.savingsRateText ?? MISSING,
      },
      { label: REPORT_ANALYSIS_LABELS.DEBT_RATIO, value: points.debt?.debtRatioText ?? MISSING },
    ],
    reportHref: `/reports/${selected}`,
    reportLabel: REPORT_ANALYSIS_LABELS.VIEW_PERIOD_REPORT(selected),
  };
};
