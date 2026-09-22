export const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

export const TREND_WIDTH = 720;
export const TREND_HEIGHT = 180;
export const TREND_PADDING_X = 8;
const TREND_PADDING_TOP = 12;
const TREND_PADDING_BOTTOM = 24;

export interface TrendGeometry {
  path: string | undefined;
  xLabels: { x: number; text: string }[];
  yLabels: { y: number; text: string }[];
}

const formatTrendValue = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }
  return `${Math.round(value)}`;
};

export const buildTrendGeometry = (
  series: { year: number; month: number; value: number }[],
): TrendGeometry => {
  const present = series.slice().sort((a, b) => a.year - b.year || a.month - b.month);

  if (present.length === 0) {
    return { path: undefined, xLabels: [], yLabels: [] };
  }

  const values = present.map((item) => item.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpan = rawMax - rawMin;
  const yMin = rawSpan === 0 ? rawMin * 0.9 : rawMin - rawSpan * 0.1;
  const yMax = rawSpan === 0 ? rawMax * 1.1 : rawMax + rawSpan * 0.1;
  const ySpan = yMax - yMin;
  const innerWidth = TREND_WIDTH - TREND_PADDING_X * 2;
  const innerHeight = TREND_HEIGHT - TREND_PADDING_TOP - TREND_PADDING_BOTTOM;

  const points = present.map((item, index) => {
    const xRatio = present.length === 1 ? 1 : index / (present.length - 1);
    const yRatio = ySpan === 0 ? 0.5 : (item.value - yMin) / ySpan;
    return {
      x: TREND_PADDING_X + xRatio * innerWidth,
      y: TREND_PADDING_TOP + (1 - yRatio) * innerHeight,
    };
  });

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  const xLabelStep = Math.max(1, Math.ceil(present.length / 3));
  const xLabels: { x: number; text: string }[] = [];
  for (let index = 0; index < present.length; index += 1) {
    const isLast = index === present.length - 1;
    if (!isLast && index % xLabelStep !== 0) continue;
    xLabels.push({
      x: points[index].x,
      text: `${MONTH_NAMES[present[index].month - 1]} ${present[index].year}`,
    });
  }

  const yLabels = [0, 1, 2, 3].map((step) => {
    const value = yMin + (ySpan * step) / 3;
    return {
      y: TREND_PADDING_TOP + (1 - step / 3) * innerHeight,
      text: formatTrendValue(value),
    };
  });

  return { path, xLabels, yLabels };
};
