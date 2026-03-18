import React from 'react';

import { type RetirementPlan } from '@/domains/retirement/types';
import RetirementProjection from '@/ui/features/retirement/pages/RetirementProjection';

interface ProjectionResultsContentProps {
  plan: RetirementPlan;
}

export const ProjectionResultsContent: React.FC<ProjectionResultsContentProps> = ({ plan }) => {
  if (!plan.summary) {
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
      <RetirementProjection plan={plan} />
    </div>
  );
};
