import React from 'react';

import RetirementProjection from '@/ui/features/retirement/pages/RetirementProjection';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

interface ProjectionResultsContentProps {
  projectionVM: RetirementProjectionVM | null;
}

export const ProjectionResultsContent: React.FC<ProjectionResultsContentProps> = ({
  projectionVM,
}) => {
  if (!projectionVM) {
    return (
      <div className="rounded-lg border p-6">
        <p className="text-muted-foreground">Click "Recalculate" to generate projection results.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Projection Results</h3>
      </div>
      <RetirementProjection projection={projectionVM} />
    </div>
  );
};
