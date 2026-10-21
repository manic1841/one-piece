import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageSection } from '@/ui/components/PageSection';
import { PROJECTION_RESULT_LABELS } from '@/ui/constants/retirement-redesign/resultLabels';
import { type ProjectionViewVM } from '@/ui/features/retirement-redesign/viewmodels/projectionViewVm';
import { NetWorthChart } from '@/ui/features/retirement/components/projection/NetWorthChart';

interface ProjectionSummaryTabProps {
  summary: ProjectionViewVM['summary'];
  projection: ProjectionViewVM['projection'];
}

/** Default tab: the six frozen summary metrics and the net-worth trajectory. */
export function ProjectionSummaryTab({ summary, projection }: ProjectionSummaryTabProps) {
  return (
    <div data-testid="projection-summary-tab">
      <PageSection title={PROJECTION_RESULT_LABELS.SUMMARY_SECTION} spacing="compact">
        <MetricGroup columns={3}>
          <Metric
            testId="metric-retirement-net-worth"
            label={PROJECTION_RESULT_LABELS.METRIC_RETIREMENT_NET_WORTH}
            value={summary.retirementNetWorthText}
          />
          <Metric
            testId="metric-final-net-worth"
            label={PROJECTION_RESULT_LABELS.METRIC_FINAL_NET_WORTH}
            value={summary.finalNetWorthText}
          />
          <Metric
            testId="metric-min-net-worth"
            label={PROJECTION_RESULT_LABELS.METRIC_MIN_NET_WORTH}
            value={summary.minNetWorthText}
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

      <PageSection title={PROJECTION_RESULT_LABELS.NET_WORTH_SECTION} spacing="compact">
        <NetWorthChart projection={projection} />
      </PageSection>
    </div>
  );
}
