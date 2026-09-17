import { formatCurrency, formatYearMonth } from '@/ui/utils';

import type { DashboardOverview, DashboardNetWorthPoint } from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';

export interface NetWorthSparklinePointVM {
  x: number;
  y: number;
}

export interface DashboardHeroVM {
  hasAnchor: boolean;
  anchorPeriodText: string | null;
  netWorthText: string;
  sparkline: {
    points: NetWorthSparklinePointVM[];
    path: string | undefined;
    areaPath: string | undefined;
  };
}

const SPARKLINE_WIDTH = 240;
const SPARKLINE_HEIGHT = 48;
const SPARKLINE_PADDING = 2;

const buildSparklineGeometry = (
  series: DashboardNetWorthPoint[],
): {
  points: NetWorthSparklinePointVM[];
  path: string | undefined;
  areaPath: string | undefined;
} => {
  const present = series
    .map((point, monthIndex) => ({ ...point, monthIndex }))
    .filter(
      (point): point is DashboardNetWorthPoint & { monthIndex: number; netAssets: number } =>
        point.netAssets !== null,
    );

  if (present.length === 0) {
    return { points: [], path: undefined, areaPath: undefined };
  }

  const values = present.map((point) => point.netAssets);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const innerWidth = SPARKLINE_WIDTH - SPARKLINE_PADDING * 2;
  const innerHeight = SPARKLINE_HEIGHT - SPARKLINE_PADDING * 2;

  const points = present.map((point) => {
    const xRatio = (point.monthIndex + 1) / series.length;
    const yRatio = span === 0 ? 0.5 : (point.netAssets - min) / span;
    return {
      x: SPARKLINE_PADDING + xRatio * innerWidth,
      y: SPARKLINE_PADDING + (1 - yRatio) * innerHeight,
    };
  });

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  const areaPath = `${path} L${points[points.length - 1].x.toFixed(1)} ${SPARKLINE_HEIGHT} L${points[0].x.toFixed(1)} ${SPARKLINE_HEIGHT} Z`;

  return { points, path, areaPath };
};

export const mapDashboardOverviewToHeroVM = (
  overview: DashboardOverview | null,
): DashboardHeroVM => {
  if (!overview?.anchor) {
    return {
      hasAnchor: false,
      anchorPeriodText: null,
      netWorthText: '—',
      sparkline: { points: [], path: undefined, areaPath: undefined },
    };
  }

  const anchor = overview.anchor;
  const [year, month] = anchor.yearMonth.split('-').map(Number);

  return {
    hasAnchor: true,
    anchorPeriodText: `${formatYearMonth(year, month)} REPORT`,
    netWorthText: formatCurrency(anchor.netWorth),
    sparkline: buildSparklineGeometry(anchor.netWorthSeries),
  };
};
