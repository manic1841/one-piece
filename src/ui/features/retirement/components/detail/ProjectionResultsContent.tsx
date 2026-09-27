import React from 'react';

import { Link } from 'react-router-dom';

import { Button } from '@/ui/components/ui/button';
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
        <p className="text-muted-foreground">
          尚無投影結果。完成每月關帳後，點擊「重新計算」以建立投影。
        </p>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link to="/close">前往每月關帳</Link>
        </Button>
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
