import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageSection } from '@/ui/components/PageSection';
import { PROJECTION_RESULT_LABELS } from '@/ui/constants/retirement-redesign/resultLabels';
import { CashFlowChart } from '@/ui/features/retirement-redesign/components/CashFlowChart';
import { NetWorthChart } from '@/ui/features/retirement-redesign/components/NetWorthChart';
import { YearlyDetails } from '@/ui/features/retirement-redesign/components/YearlyDetails';
import { type ProjectionSummary } from '@/ui/features/retirement-redesign/hooks/useProjectionWorkspace';
import { type RetirementProjectionVM } from '@/ui/features/retirement-redesign/viewmodels/projectionDisplayVm';
import { formatCurrency } from '@/ui/utils';

interface ProjectionResultsProps {
  projection: RetirementProjectionVM;
  summary: ProjectionSummary;
}

const money = (value: number | null): string =>
  value === null ? PROJECTION_RESULT_LABELS.NONE : formatCurrency(value);

const year = (value: number | null): string =>
  value === null ? PROJECTION_RESULT_LABELS.NONE : String(value);

/** Calculated preview: six summary metrics, trajectory and yearly breakdown. */
export function ProjectionResults({ projection, summary }: ProjectionResultsProps) {
  return (
    <div className="space-y-6" data-testid="projection-results">
      <PageSection title={PROJECTION_RESULT_LABELS.SUMMARY_SECTION} spacing="compact">
        <MetricGroup columns={3}>
          <Metric
            testId="metric-retirement-net-worth"
            label={PROJECTION_RESULT_LABELS.METRIC_RETIREMENT_NET_WORTH}
            value={money(summary.retirementNetWorth)}
          />
          <Metric
            testId="metric-final-net-worth"
            label={PROJECTION_RESULT_LABELS.METRIC_FINAL_NET_WORTH}
            value={money(summary.finalNetWorth)}
          />
          <Metric
            testId="metric-min-net-worth"
            label={PROJECTION_RESULT_LABELS.METRIC_MIN_NET_WORTH}
            value={money(summary.minNetWorth)}
          />
          <Metric
            testId="metric-min-net-worth-year"
            label={PROJECTION_RESULT_LABELS.METRIC_MIN_NET_WORTH_YEAR}
            value={year(summary.minNetWorthYear)}
          />
          <Metric
            testId="metric-bankruptcy-year"
            label={PROJECTION_RESULT_LABELS.METRIC_BANKRUPTCY_YEAR}
            value={year(summary.bankruptcyYear)}
          />
          <Metric
            testId="metric-is-bankrupt"
            label={PROJECTION_RESULT_LABELS.METRIC_IS_BANKRUPT}
            value={summary.isBankrupt ? PROJECTION_RESULT_LABELS.YES : PROJECTION_RESULT_LABELS.NO}
            tone={summary.isBankrupt ? 'negative' : 'positive'}
          />
        </MetricGroup>
      </PageSection>

      <PageSection title={PROJECTION_RESULT_LABELS.NET_WORTH_SECTION} spacing="compact">
        <NetWorthChart projection={projection} />
      </PageSection>

      <PageSection title={PROJECTION_RESULT_LABELS.CASH_FLOW_SECTION} spacing="compact">
        <CashFlowChart projection={projection} />
      </PageSection>

      <PageSection title={PROJECTION_RESULT_LABELS.YEARS_SECTION} spacing="compact">
        <YearlyDetails projection={projection} />
      </PageSection>
    </div>
  );
}
