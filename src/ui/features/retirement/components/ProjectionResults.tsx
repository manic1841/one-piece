import { PageSection } from '@/ui/components/PageSection';
import { PROJECTION_RESULT_LABELS } from '@/ui/constants/retirement/resultLabels';
import { CashFlowChart } from '@/ui/features/retirement/components/CashFlowChart';
import { NetWorthChart } from '@/ui/features/retirement/components/NetWorthChart';
import { SummaryMetrics } from '@/ui/features/retirement/components/SummaryMetrics';
import { YearlyDetails } from '@/ui/features/retirement/components/YearlyDetails';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/projectionDisplayVm';
import { type ProjectionSummaryVM } from '@/ui/features/retirement/viewmodels/projectionViewVm';

interface ProjectionResultsProps {
  projection: RetirementProjectionVM;
  summary: ProjectionSummaryVM;
}

/** Calculated preview: six summary metrics, trajectory and yearly breakdown. */
export function ProjectionResults({ projection, summary }: ProjectionResultsProps) {
  return (
    <div className="space-y-6" data-testid="projection-results">
      <SummaryMetrics summary={summary} />

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
