import type { DashboardCashFlowPoint } from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';
import { formatCurrency } from '@/ui/utils';

export type { DashboardCashFlowPoint };

export interface DashboardCashFlowChartPointVM {
  label: string;
  value: number | null;
  x: number;
  y: number;
}

export interface DashboardCashFlowChartVM {
  points: DashboardCashFlowChartPointVM[];
  path: string | undefined;
  zeroY: number;
  hasData: boolean;
  latest: DashboardCashFlowChartPointVM | null;
  latestText: string | null;
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 140;
const PADDING_X = 8;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 22;

const MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

export const mapCashFlowSeriesToChartVM = (
  series: DashboardCashFlowPoint[],
): DashboardCashFlowChartVM => {
  const present = series
    .map((point, monthIndex) => ({ ...point, monthIndex }))
    .filter(
      (point): point is DashboardCashFlowPoint & { monthIndex: number; netCashFlow: number } =>
        point.netCashFlow !== null,
    );

  const zeroY = PADDING_TOP + (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) / 2;

  const points = series.map((point, index) => {
    const innerWidth = CHART_WIDTH - PADDING_X * 2;
    const xRatio = series.length <= 1 ? 0 : index / (series.length - 1);
    return {
      label: `${MONTH_NAMES[point.month - 1]} ${point.year}`,
      value: point.netCashFlow,
      x: PADDING_X + xRatio * innerWidth,
      y: zeroY,
    };
  });

  if (present.length === 0) {
    return { points, path: undefined, zeroY, hasData: false, latest: null, latestText: null };
  }

  const values = present.map((point) => point.netCashFlow);
  const maxAbs = Math.max(...values.map((value) => Math.abs(value)), 1);
  const amplitude = (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) / 2;

  for (const point of points) {
    if (point.value !== null) {
      const ratio = point.value / maxAbs;
      point.y = zeroY - ratio * amplitude;
    }
  }

  const drawn = points.filter((point) => point.value !== null);
  const path = drawn
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  const latest = drawn[drawn.length - 1];

  return {
    points,
    path,
    zeroY,
    hasData: true,
    latest,
    latestText: formatCurrency(latest.value as number),
  };
};
