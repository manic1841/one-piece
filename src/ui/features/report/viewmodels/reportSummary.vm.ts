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
  /** 原始值，供 M07 補間；缺值時為 null。 */
  value: number | null;
  /** 補間每一幀的格式器。 */
  format: (value: number) => string;
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

const analysisHref = (anchor: string, series?: SeriesParam): string =>
  `${ANALYSIS_PATH}${series === undefined ? '' : `?series=${series}`}#${anchor}`;

const summaryKpi = (
  key: SummaryKpiKey,
  label: string,
  value: number | null,
  format: (value: number) => string,
  href: string,
  ariaLabel: string,
  tone: MoneyTone = 'default',
): SummaryKpiVM => ({ key, label, value, format, tone, href, ariaLabel });

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
        kpis.assets,
        formatCurrency,
        analysisHref(ANALYSIS_ANCHORS.NET_WORTH, 'assets'),
        REPORT_SUMMARY_LABELS.ARIA_TOTAL_ASSETS,
      ),
      summaryKpi(
        'netWorth',
        REPORT_SUMMARY_LABELS.NET_WORTH,
        kpis.netWorth,
        formatCurrency,
        analysisHref(ANALYSIS_ANCHORS.NET_WORTH),
        REPORT_SUMMARY_LABELS.ARIA_NET_WORTH,
      ),
      summaryKpi(
        'totalLiabilities',
        REPORT_SUMMARY_LABELS.TOTAL_LIABILITIES,
        kpis.liabilities,
        formatCurrency,
        analysisHref(ANALYSIS_ANCHORS.NET_WORTH, 'debt'),
        REPORT_SUMMARY_LABELS.ARIA_TOTAL_LIABILITIES,
      ),
      summaryKpi(
        'savingsRate',
        REPORT_SUMMARY_LABELS.SAVINGS_RATE,
        kpis.savingsRate,
        formatPercentageOrDash,
        analysisHref(ANALYSIS_ANCHORS.INCOME),
        REPORT_SUMMARY_LABELS.ARIA_SAVINGS_RATE,
        kpis.savingsRate !== null && kpis.savingsRate < 0 ? 'negative' : 'default',
      ),
    ],
  };
};
