import React from 'react';

import { CashFlowChart } from '@/ui/features/retirement/components/projection/CashFlowChart';
import { ExpenseBreakdownCard } from '@/ui/features/retirement/components/projection/ExpenseBreakdownCard';
import { SummaryStats } from '@/ui/features/retirement/components/projection/SummaryStats';
import { YearlyDetails } from '@/ui/features/retirement/components/projection/YearlyDetails';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

type ProjectionSection = 'overview' | 'netWorth' | 'cashFlow';

interface ProjectionResultsContentProps {
  projectionVM: RetirementProjectionVM | null;
  section: ProjectionSection;
}

export const ProjectionResultsContent: React.FC<ProjectionResultsContentProps> = ({
  projectionVM,
  section,
}) => {
  if (!projectionVM) {
    return (
      <div className="rounded-lg border p-6">
        <p className="text-muted-foreground">Click "Recalculate" to generate projection results.</p>
      </div>
    );
  }

  if (section === 'netWorth') {
    return <CashFlowChart projection={projectionVM} />;
  }

  if (section === 'cashFlow') {
    return <YearlyDetails projection={projectionVM} />;
  }

  return (
    <div className="space-y-6">
      <SummaryStats projection={projectionVM} />
      <ExpenseBreakdownCard pieData={projectionVM.expenseBreakdownChartData || []} />
    </div>
  );
};
