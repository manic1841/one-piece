import { CashFlowChart } from '@/ui/features/retirement/components/projection/CashFlowChart';
import { ExpenseBreakdownCard } from '@/ui/features/retirement/components/projection/ExpenseBreakdownCard';
import { SummaryStats } from '@/ui/features/retirement/components/projection/SummaryStats';
import { YearlyDetails } from '@/ui/features/retirement/components/projection/YearlyDetails';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

type RetirementProjectionProps = {
  projection: RetirementProjectionVM;
};

type PieDataItem = {
  name: string;
  value: number;
  type: 'fixed' | 'variable';
};

export default function RetirementProjection({ projection }: RetirementProjectionProps) {
  const pieData = (projection.expenseBreakdownChartData || []) as PieDataItem[];

  return (
    <div className="space-y-6">
      <CashFlowChart projection={projection} />
      <ExpenseBreakdownCard pieData={pieData} />
      <SummaryStats projection={projection} />
      <YearlyDetails projection={projection} />
    </div>
  );
}
