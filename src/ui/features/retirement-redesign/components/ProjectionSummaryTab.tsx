import { PageSection } from '@/ui/components/PageSection';
import { PROJECTION_RESULT_LABELS } from '@/ui/constants/retirement-redesign/resultLabels';
import { NetWorthChart } from '@/ui/features/retirement-redesign/components/NetWorthChart';
import { SummaryMetrics } from '@/ui/features/retirement-redesign/components/SummaryMetrics';
import { type ProjectionViewVM } from '@/ui/features/retirement-redesign/viewmodels/projectionViewVm';

interface ProjectionSummaryTabProps {
  summary: ProjectionViewVM['summary'];
  projection: ProjectionViewVM['projection'];
}

/** Default tab: the six frozen summary metrics and the net-worth trajectory. */
export function ProjectionSummaryTab({ summary, projection }: ProjectionSummaryTabProps) {
  return (
    <div data-testid="projection-summary-tab">
      <SummaryMetrics summary={summary} />

      <PageSection title={PROJECTION_RESULT_LABELS.NET_WORTH_SECTION} spacing="compact">
        <NetWorthChart projection={projection} />
      </PageSection>
    </div>
  );
}
