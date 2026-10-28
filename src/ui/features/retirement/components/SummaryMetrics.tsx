import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageSection } from '@/ui/components/PageSection';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { PROJECTION_RESULT_LABELS } from '@/ui/constants/retirement/resultLabels';

export interface SummaryMetricValues {
  retirementNetWorthText: string | null;
  finalNetWorthText: string;
  minNetWorthText: string;
  minNetWorthYearText: string;
  bankruptcyYearText: string;
  isBankruptText: string;
  isBankrupt: boolean;
  minNetWorthNegative: boolean;
  finalNetWorthNegative: boolean;
}

/** Shared six-metric block used by the calculated preview and the saved view. */
export function SummaryMetrics({ summary }: { summary: SummaryMetricValues }) {
  return (
    <PageSection title={PROJECTION_RESULT_LABELS.SUMMARY_SECTION} spacing="compact">
      <MetricGroup columns={3}>
        <Metric
          testId="metric-retirement-net-worth"
          label={PROJECTION_RESULT_LABELS.METRIC_RETIREMENT_NET_WORTH}
          value={summary.retirementNetWorthText ?? PROJECTION_COMMON_LABELS.DASH}
        />
        <Metric
          testId="metric-final-net-worth"
          label={PROJECTION_RESULT_LABELS.METRIC_FINAL_NET_WORTH}
          value={summary.finalNetWorthText}
          tone={summary.finalNetWorthNegative ? 'negative' : 'default'}
        />
        <Metric
          testId="metric-min-net-worth"
          label={PROJECTION_RESULT_LABELS.METRIC_MIN_NET_WORTH}
          value={summary.minNetWorthText}
          tone={summary.minNetWorthNegative ? 'negative' : 'default'}
        />
        <Metric
          testId="metric-min-net-worth-year"
          label={PROJECTION_RESULT_LABELS.METRIC_MIN_NET_WORTH_YEAR}
          value={summary.minNetWorthYearText}
        />
        <Metric
          testId="metric-bankruptcy-year"
          label={PROJECTION_RESULT_LABELS.METRIC_BANKRUPTCY_YEAR}
          value={summary.bankruptcyYearText}
        />
        <Metric
          testId="metric-is-bankrupt"
          label={PROJECTION_RESULT_LABELS.METRIC_IS_BANKRUPT}
          value={summary.isBankruptText}
          tone={summary.isBankrupt ? 'negative' : 'positive'}
        />
      </MetricGroup>
    </PageSection>
  );
}
