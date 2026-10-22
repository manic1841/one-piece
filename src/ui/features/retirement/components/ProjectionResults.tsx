import { PageSection } from '@/ui/components/PageSection';
import { PROJECTION_RESULT_LABELS } from '@/ui/constants/retirement/resultLabels';
import { ProjectionTrajectory } from '@/ui/features/retirement/components/ProjectionTrajectory';
import { SummaryMetrics } from '@/ui/features/retirement/components/SummaryMetrics';
import { YearlyDetails } from '@/ui/features/retirement/components/YearlyDetails';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/projectionDisplay.vm';
import { type ProjectionSummaryVM } from '@/ui/features/retirement/viewmodels/projectionView.vm';

interface ProjectionResultsProps {
  projection: RetirementProjectionVM;
  summary: ProjectionSummaryVM;
}

/** Calculated preview: summary metrics, the trajectory (one view at a time) and the yearly breakdown. */
export function ProjectionResults({ projection, summary }: ProjectionResultsProps) {
  return (
    <div className="space-y-6" data-testid="projection-results">
      <SummaryMetrics summary={summary} />

      <PageSection title={PROJECTION_RESULT_LABELS.TRAJECTORY_SECTION} spacing="compact">
        <ProjectionTrajectory projection={projection} />
      </PageSection>

      <PageSection title={PROJECTION_RESULT_LABELS.YEARS_SECTION} spacing="compact">
        <YearlyDetails projection={projection} />
      </PageSection>
    </div>
  );
}
