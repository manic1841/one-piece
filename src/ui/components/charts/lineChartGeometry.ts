/**
 * Line geometry for `LineChart`. Charts stay data-driven: callers pass values,
 * the geometry (path, gridlines, labels) is derived here so every line chart in
 * the app shares one scale and label algorithm.
 */
export const LINE_CHART_WIDTH = 700;
export const LINE_CHART_HEIGHT = 150;

const PADDING_TOP = 12;
const PADDING_BOTTOM = 12;
const DEFAULT_GRID_LINES = 4;
const DEFAULT_MAX_X_LABELS = 7;

export interface LinePoint {
  /** SVG x, in viewBox units. */
  x: number;
  /** SVG y, in viewBox units. */
  y: number;
  value: number;
  /** x as a 0–1 fraction of the plot width. */
  xRatio: number;
  /** Value position as a 0–1 fraction of the data range (0 = low, 1 = high). */
  yRatio: number;
  /**
   * y as a 0–1 fraction of the plot height measured from the top, padding
   * included. HTML overlays must anchor with this, not `yRatio`: `yRatio` is
   * data-space (0 = low) while CSS `top:` is screen-space (0 = top).
   */
  topRatio: number;
}

export interface LineChartGeometry {
  points: LinePoint[];
  path: string;
  areaPath: string;
  /** Horizontal gridline positions, in viewBox units. */
  gridLines: number[];
  xLabels: { x: number; text: string }[];
  /** y-axis value labels aligned to the gridlines (top to bottom). */
  yLabels: { y: number; text: string }[];
  /** y position of value 0, present only when 0 falls inside the value range. */
  zeroLineY?: number;
}

const EMPTY_GEOMETRY: LineChartGeometry = {
  points: [],
  path: '',
  areaPath: '',
  gridLines: [],
  xLabels: [],
  yLabels: [],
};

const formatAxisValue = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)}K`;
  return `${Math.round(value)}`;
};

/**
 * Build a line geometry. By default the y scale is padded around the data
 * range so small movements in a large balance remain readable; `includeZero`
 * pins the range to include 0 (0-baseline charts). `zeroLineY` marks where 0
 * sits when it falls inside the value range.
 */
export function buildLineGeometry(
  values: number[],
  labels: string[] = [],
  gridLineCount = DEFAULT_GRID_LINES,
  maxXLabels = DEFAULT_MAX_X_LABELS,
  includeZero = false,
): LineChartGeometry {
  if (values.length === 0) return EMPTY_GEOMETRY;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const innerHeight = LINE_CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  let yMin: number;
  let yMax: number;
  if (includeZero) {
    yMin = Math.min(0, min);
    yMax = Math.max(0, max);
    if (yMin === yMax) {
      const pad = Math.abs(yMax || 1) * 0.1;
      yMin -= pad;
      yMax += pad;
    }
  } else {
    const fallbackPad = Math.abs(max || 1) * 0.1;
    yMin = span === 0 ? min - fallbackPad : min - span * 0.1;
    yMax = span === 0 ? max + fallbackPad : max + span * 0.1;
  }
  const ySpan = yMax - yMin;

  const points: LinePoint[] = values.map((value, index) => {
    const xRatio = values.length === 1 ? 0 : index / (values.length - 1);
    const yRatio = (value - yMin) / ySpan;
    const y = Number((PADDING_TOP + (1 - yRatio) * innerHeight).toFixed(2));
    return {
      x: Number((xRatio * LINE_CHART_WIDTH).toFixed(2)),
      y,
      value,
      xRatio,
      yRatio,
      topRatio: Number((y / LINE_CHART_HEIGHT).toFixed(4)),
    };
  });

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
    .join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const areaPath = `${path} L${last.x} ${LINE_CHART_HEIGHT} L${first.x} ${LINE_CHART_HEIGHT} Z`;

  const lineCount = Math.max(2, gridLineCount);
  const gridLines = Array.from({ length: lineCount }, (_, index) => {
    const ratio = index / (lineCount - 1);
    return Number((PADDING_TOP + (1 - ratio) * innerHeight).toFixed(2));
  });

  const xLabels: { x: number; text: string }[] = [];
  if (labels.length === values.length) {
    const step = Math.max(1, Math.ceil(values.length / maxXLabels));
    values.forEach((_, index) => {
      const isLast = index === values.length - 1;
      if (!isLast && index % step !== 0) return;
      xLabels.push({ x: points[index].x, text: labels[index] });
    });
  }

  const yLabels = gridLines.map((y, index) => ({
    y,
    text: formatAxisValue(yMin + (1 - index / (lineCount - 1)) * ySpan),
  }));
  const zeroLineY =
    0 >= yMin && 0 <= yMax
      ? Number((PADDING_TOP + (1 - (0 - yMin) / ySpan) * innerHeight).toFixed(2))
      : undefined;

  return { points, path, areaPath, gridLines, xLabels, yLabels, zeroLineY };
}
