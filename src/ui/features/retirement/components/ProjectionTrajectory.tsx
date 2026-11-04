import { useState } from 'react';

import { FilterStrip } from '@/ui/components/FilterStrip';
import { PROJECTION_VIEW_LABELS } from '@/ui/constants/retirement/projectionLabels';
import { CashFlowChart } from '@/ui/features/retirement/components/CashFlowChart';
import { NetWorthChart } from '@/ui/features/retirement/components/NetWorthChart';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/projectionDisplay.vm';

type TrajectoryView = 'netWorth' | 'cashFlow';

const VIEW_ITEMS = [
  { id: 'netWorth', label: PROJECTION_VIEW_LABELS.CHART_VIEW_NET_WORTH },
  { id: 'cashFlow', label: PROJECTION_VIEW_LABELS.CHART_VIEW_CASH_FLOW },
];

type ProjectionTrajectoryProps = {
  projection: RetirementProjectionVM;
  selectedYear?: number | null;
  onSelectYear?: (year: number) => void;
};

/**
 * One trajectory slot with a single-choice view: net worth stays the default
 * because it is the page's conclusion; the cash-flow composition is one click
 * away instead of a second stacked chart competing with it.
 *
 * The view is local to the slot — switching keeps the page-owned selection.
 */
export function ProjectionTrajectory({
  projection,
  selectedYear = null,
  onSelectYear,
}: ProjectionTrajectoryProps) {
  const [view, setView] = useState<TrajectoryView>('netWorth');

  return (
    <div className="space-y-3" data-testid="projection-trajectory">
      <FilterStrip
        items={VIEW_ITEMS}
        value={view}
        onValueChange={(next) => setView(next as TrajectoryView)}
        ariaLabel={PROJECTION_VIEW_LABELS.CHART_VIEW_LABEL}
      />
      {view === 'netWorth' ? (
        <NetWorthChart
          projection={projection}
          selectedYear={selectedYear}
          {...(onSelectYear === undefined ? {} : { onSelectYear })}
        />
      ) : (
        <CashFlowChart
          projection={projection}
          selectedYear={selectedYear}
          {...(onSelectYear === undefined ? {} : { onSelectYear })}
        />
      )}
    </div>
  );
}
