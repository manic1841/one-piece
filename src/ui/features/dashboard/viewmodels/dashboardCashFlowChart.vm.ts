import type { DashboardCashFlowPoint } from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';
import type { BarChartSeries } from '@/ui/components/charts/BarChart';
import type { ChartPoint } from '@/ui/components/charts/chartInteraction';
import { DASHBOARD_CASHFLOW_LABELS } from '@/ui/constants/dashboard/cashFlowLabels';
import { formatCurrency, formatMonthLabel } from '@/ui/utils';

export type { DashboardCashFlowPoint };

export interface DashboardCashFlowChartVM {
  series: BarChartSeries[];
  labels: string[];
  points: ChartPoint[];
  hasData: boolean;
  latestText: string | null;
}

type PresentCashFlowPoint = DashboardCashFlowPoint & {
  netCashFlow: number;
  cashIn: number;
  cashOut: number;
};

export const mapCashFlowSeriesToChartVM = (
  series: DashboardCashFlowPoint[],
): DashboardCashFlowChartVM => {
  const present = series.filter(
    (point): point is PresentCashFlowPoint =>
      point.netCashFlow !== null && point.cashIn !== null && point.cashOut !== null,
  );
  const latest = present[present.length - 1];
  const labels = present.map((point) => formatMonthLabel(point.year, point.month));

  return {
    series: [
      { tone: 'positive', values: present.map((point) => point.cashIn) },
      { tone: 'negative', values: present.map((point) => point.cashOut) },
    ],
    labels,
    points: labels.map((label, index) => ({
      title: label,
      value: `${DASHBOARD_CASHFLOW_LABELS.INFLOW} +${formatCurrency(present[index].cashIn)}`,
      meta: `${DASHBOARD_CASHFLOW_LABELS.OUTFLOW} −${formatCurrency(present[index].cashOut)}`,
    })),
    hasData: present.length > 0,
    latestText: latest !== undefined ? formatCurrency(latest.netCashFlow) : null,
  };
};
