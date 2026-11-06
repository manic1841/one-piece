import { type ReportSummary } from '@/application/report/use_cases/getReportSummaryWorkflow';
import { type MoneyTone } from '@/ui/components/moneyTone';
import {
  ANALYSIS_ANCHORS,
  ANALYSIS_PATH,
  REPORT_SUMMARY_LABELS,
} from '@/ui/constants/report/reportCenterLabels';
import { formatCurrency, formatPercentageOrDash } from '@/ui/utils';

import { type SeriesParam } from './reportAnalysis.vm';
import { formatReportPeriodDisplay, parseReportPeriod } from './reportHistory.vm';

export type SummaryKpiKey = 'totalAssets' | 'netWorth' | 'totalLiabilities' | 'savingsRate';

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

const DASH = REPORT_SUMMARY_LABELS.MISSING;

const periodTextOf = (yearMonth: string | null): string => {
  if (yearMonth === null) return DASH;
  const period = parseReportPeriod(yearMonth);
  return period === null ? yearMonth : formatReportPeriodDisplay(period);
};

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
export const buildReportSummaryVM = (summary: ReportSummary): ReportSummaryVM => {
  const { kpis } = summary;
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
        formatPercentageOrDash(kpis.savingsRate),
        analysisHref(ANALYSIS_ANCHORS.INCOME),
        REPORT_SUMMARY_LABELS.ARIA_SAVINGS_RATE,
        kpis.savingsRate !== null && kpis.savingsRate < 0 ? 'negative' : 'default',
      ),
    ],
  };
};
