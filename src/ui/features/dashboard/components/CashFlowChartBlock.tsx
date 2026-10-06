import React from 'react';

import { PageSection } from '@/ui/components/PageSection';
import { Skeleton } from '@/ui/components/Skeleton';
import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { InteractiveBarChart } from '@/ui/components/charts/InteractiveBarChart';
import { DASHBOARD_CASHFLOW_LABELS } from '@/ui/constants/dashboard/cashFlowLabels';
import { mapCashFlowSeriesToChartVM } from '@/ui/features/dashboard/viewmodels/dashboardCashFlowChart.vm';
import type { DashboardCashFlowPoint } from '@/ui/features/dashboard/viewmodels/dashboardCashFlowChart.vm';

interface CashFlowChartBlockProps {
  series: DashboardCashFlowPoint[];
  loading: boolean;
}

export const CashFlowChartBlock: React.FC<CashFlowChartBlockProps> = ({ series, loading }) => {
  const chartVM = mapCashFlowSeriesToChartVM(series);

  return (
    <PageSection title={DASHBOARD_CASHFLOW_LABELS.SECTION_TITLE} spacing="compact">
      {loading ? (
        <Skeleton className="h-44 w-full" />
      ) : !chartVM.hasData ? (
        <p className="text-sm text-muted-foreground">{DASHBOARD_CASHFLOW_LABELS.EMPTY_HINT}</p>
      ) : (
        <div data-testid="cashflow-chart" className="mt-4">
          <InteractiveBarChart
            labels={chartVM.labels}
            series={chartVM.series}
            points={chartVM.points}
            height={150}
            ariaLabel="Monthly cash flow with detail"
          />
          <ChartLegend
            className="mt-4"
            items={[
              { label: DASHBOARD_CASHFLOW_LABELS.INFLOW, tone: 'positive' },
              { label: DASHBOARD_CASHFLOW_LABELS.OUTFLOW, tone: 'negative' },
            ]}
          />
          {chartVM.latestText !== null && (
            <p className="mt-3 font-mono text-sm tabular-nums text-foreground">
              {chartVM.latestText}
            </p>
          )}
        </div>
      )}
    </PageSection>
  );
};
