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
  trend: {
    path: string | undefined;
    areaPath: string | undefined;
    endPoint: NetWorthSparklinePointVM | undefined;
    xLabels: { x: number; text: string }[];
    yLabels: { y: number; text: string }[];
  };
}

const SPARKLINE_WIDTH = 240;
const SPARKLINE_HEIGHT = 48;
const SPARKLINE_PADDING = 2;

const TREND_WIDTH = 720;
const TREND_HEIGHT = 220;
const TREND_PADDING_X = 8;
const TREND_PADDING_TOP = 12;
const TREND_PADDING_BOTTOM = 24;
const TREND_Y_LABEL_COUNT = 4;

const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

const formatTrendValue = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }
  return `${Math.round(value)}`;
};

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
      trend: { path: undefined, areaPath: undefined, endPoint: undefined, xLabels: [], yLabels: [] },
    };
  }

  const anchor = overview.anchor;
  const [year, month] = anchor.yearMonth.split('-').map(Number);

  return {
    hasAnchor: true,
    anchorPeriodText: `${formatYearMonth(year, month)} REPORT`,
    netWorthText: formatCurrency(anchor.netWorth),
    sparkline: buildSparklineGeometry(anchor.netWorthSeries),
    trend: buildTrendGeometry(anchor.netWorthSeries),
  };
};

const buildTrendGeometry = (
  series: DashboardNetWorthPoint[],
): {
  path: string | undefined;
  areaPath: string | undefined;
  endPoint: NetWorthSparklinePointVM | undefined;
  xLabels: { x: number; text: string }[];
  yLabels: { y: number; text: string }[];
} => {
  const present = series
    .map((point, monthIndex) => ({ ...point, monthIndex }))
    .filter(
      (point): point is DashboardNetWorthPoint & { monthIndex: number; netAssets: number } =>
        point.netAssets !== null,
    );

  if (present.length === 0) {
    return { path: undefined, areaPath: undefined, endPoint: undefined, xLabels: [], yLabels: [] };
  }

  const values = present.map((point) => point.netAssets);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpan = rawMax - rawMin;
  const yMin = rawSpan === 0 ? rawMin * 0.9 : 0;
  const yMax = rawSpan === 0 ? rawMax * 1.1 : rawMax;
  const ySpan = yMax - yMin;
  const innerWidth = TREND_WIDTH - TREND_PADDING_X * 2;
  const innerHeight = TREND_HEIGHT - TREND_PADDING_TOP - TREND_PADDING_BOTTOM;

  const points = present.map((point, index) => {
    const xRatio = present.length === 1 ? 1 : index / (present.length - 1);
    const yRatio = ySpan === 0 ? 0.5 : (point.netAssets - yMin) / ySpan;
    return {
      x: TREND_PADDING_X + xRatio * innerWidth,
      y: TREND_PADDING_TOP + (1 - yRatio) * innerHeight,
    };
  });

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  const areaPath = `${path} L${points[points.length - 1].x.toFixed(1)} ${TREND_HEIGHT - TREND_PADDING_BOTTOM} L${points[0].x.toFixed(1)} ${TREND_HEIGHT - TREND_PADDING_BOTTOM} Z`;

  const endPoint = points[points.length - 1];

  const xLabelStep = Math.max(1, Math.ceil(present.length / 3));
  const xLabels: { x: number; text: string }[] = [];
  for (let index = 0; index < present.length; index += 1) {
    const isLast = index === present.length - 1;
    if (!isLast && index % xLabelStep !== 0) continue;
    const labelPoint = present[index];
    xLabels.push({
      x: points[index].x,
      text: `${MONTH_NAMES[labelPoint.month - 1]} ${labelPoint.year}`,
    });
  }

  const yLabels = Array.from({ length: TREND_Y_LABEL_COUNT }, (_, index) => {
    const value = yMin + (ySpan * index) / (TREND_Y_LABEL_COUNT - 1);
    return {
      y: TREND_PADDING_TOP + (1 - index / (TREND_Y_LABEL_COUNT - 1)) * innerHeight,
      text: formatTrendValue(value),
    };
  });

  return { path, areaPath, endPoint, xLabels, yLabels };
};
