import { PageSection } from '@/ui/components/PageSection';
import { PROJECTION_VIEW_LABELS } from '@/ui/constants/retirement-redesign/projectionLabels';
import { PROJECTION_RESULT_LABELS } from '@/ui/constants/retirement-redesign/resultLabels';
import { CashFlowChart } from '@/ui/features/retirement-redesign/components/CashFlowChart';
import { YearlyDetails } from '@/ui/features/retirement-redesign/components/YearlyDetails';
import { type ProjectionViewVM } from '@/ui/features/retirement-redesign/viewmodels/projectionViewVm';

interface ProjectionResultTabProps {
  projection: ProjectionViewVM['projection'];
}

/** Cash flow and the shared yearly breakdown for the frozen annual results. */
export function ProjectionResultTab({ projection }: ProjectionResultTabProps) {
  if (projection.chartData.length === 0) {
    return (
      <p className="py-8 text-sm text-muted-foreground" data-testid="projection-projection-tab">
        {PROJECTION_VIEW_LABELS.EMPTY_RESULTS}
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="projection-projection-tab">
      <PageSection title={PROJECTION_RESULT_LABELS.CASH_FLOW_SECTION} spacing="compact">
        <CashFlowChart projection={projection} />
      </PageSection>
      <PageSection title={PROJECTION_RESULT_LABELS.YEARS_SECTION} spacing="compact">
        <YearlyDetails projection={projection} />
      </PageSection>
    </div>
  );
}
