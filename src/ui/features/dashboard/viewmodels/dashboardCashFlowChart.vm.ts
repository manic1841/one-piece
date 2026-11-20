import type { DashboardCashFlowPoint } from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';
import type { BarChartSeries } from '@/ui/components/charts/BarChart';
import { DASHBOARD_CASHFLOW_LABELS } from '@/ui/constants/dashboard/cashFlowLabels';
import { formatCurrency, formatMonthLabel } from '@/ui/utils';
import { type ChartPoint, heroPoint } from '@/ui/utils/chartInteraction';

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
    points: labels.map((label, index) =>
      heroPoint(
        label,
        {
          id: 'inflow',
          label: DASHBOARD_CASHFLOW_LABELS.INFLOW,
          value: `+${formatCurrency(present[index].cashIn)}`,
        },
        [
          {
            id: 'outflow',
            label: DASHBOARD_CASHFLOW_LABELS.OUTFLOW,
            value: `−${formatCurrency(present[index].cashOut)}`,
          },
        ],
      ),
    ),
    hasData: present.length > 0,
    latestText: latest !== undefined ? formatCurrency(latest.netCashFlow) : null,
  };
};
