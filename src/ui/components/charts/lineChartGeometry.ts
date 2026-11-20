/**
 * Line geometry for `LineChart`. Charts stay data-driven: callers pass values,
 * the geometry (path, gridlines, labels) is derived here so every line chart in
 * the app shares one scale and label algorithm.
 */
import { labelZeroBaseline } from './axisLabels';
import { MAX_X_LABELS, pickXLabels, shortenXLabels } from './xLabels';

export const LINE_CHART_WIDTH = 700;
export const LINE_CHART_HEIGHT = 150;

const PADDING_TOP = 12;
const PADDING_BOTTOM = 12;
const DEFAULT_GRID_LINES = 4;

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
  /** Horizontal gridline positions, in viewBox units, top to bottom. */
  gridLines: number[];
  xLabels: { x: number; text: string }[];
  /** y-axis value labels, one per gridline, ordered **top to bottom** (largest first). */
  yLabels: { y: number; text: string }[];
  /** y position of value 0, present only when 0 falls inside the value range. */
  zeroLineY?: number;
}

export interface LineChartOptions {
  /** Number of gridlines and tick labels. Defaults to 4; never fewer than 2. */
  yTicks?: number;
  /** Most x labels to keep. Defaults to `MAX_X_LABELS`; never fewer than 2. */
  maxXLabels?: number;
  /** Pin the y range to include 0 (0-baseline charts). */
  includeZero?: boolean;
}

const EMPTY_GEOMETRY: LineChartGeometry = {
  points: [],
  path: '',
  areaPath: '',
  gridLines: [],
  xLabels: [],
  yLabels: [],
};

/**
 * Compact axis tick (1.2M / 850K / 42), capped at 6 characters for the gutter.
 *
 * Every bucket rounds before it divides, so a value just under 10× the unit
 * prints as the next integer (999.6K is `1000K`) instead of `1000.0K`. The
 * decimal is dropped from 10M up, where the sign plus the decimal would
 * overflow the cap.
 */
export const formatAxisValue = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 10_000_000) return `${Math.round(value / 1_000_000)}M`;
  if (abs >= 999_950) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 999.95) return `${Math.round(value / 1_000)}K`;
  return `${Math.round(value)}`;
};

/**
 * Drop interior ticks that repeat the previous label. The first and last always
 * survive: an axis needs both ends even when the scale is flat enough to repeat.
 */
const dropRepeatedLabels = (labels: { y: number; text: string }[]) => {
  const kept: { y: number; text: string }[] = [];
  labels.forEach((label, index) => {
    const isEdge = index === 0 || index === labels.length - 1;
    const previous = kept[kept.length - 1];
    if (!isEdge && previous !== undefined && previous.text === label.text) return;
    kept.push(label);
  });
  return kept;
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
  options: LineChartOptions = {},
): LineChartGeometry {
  if (values.length === 0) return EMPTY_GEOMETRY;

  const { yTicks = DEFAULT_GRID_LINES, maxXLabels = MAX_X_LABELS, includeZero = false } = options;

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

  // Top to bottom, like `composedChartGeometry`: index 0 is the highest value's
  // line. Every axis reader (labels, overlay anchors) relies on that order.
  const lineCount = Math.max(2, yTicks);
  const gridLines = Array.from({ length: lineCount }, (_, index) => {
    const ratio = index / (lineCount - 1);
    return Number((PADDING_TOP + ratio * innerHeight).toFixed(2));
  });

  const xLabels: { x: number; text: string }[] = [];
  if (labels.length === values.length) {
    xLabels.push(
      ...shortenXLabels(labels, pickXLabels(values.length, maxXLabels)).map(({ index, text }) => ({
        x: points[index].x,
        text,
      })),
    );
  }

  const zeroLineY =
    0 >= yMin && 0 <= yMax
      ? Number((PADDING_TOP + (1 - (0 - yMin) / ySpan) * innerHeight).toFixed(2))
      : undefined;

  // The value at gridline `index` mirrors the point mapping: index 0 is `yMax`.
  const yLabels = labelZeroBaseline(
    dropRepeatedLabels(
      gridLines.map((y, index) => ({
        y,
        text: formatAxisValue(yMax - (index / (lineCount - 1)) * ySpan),
      })),
    ),
    zeroLineY,
  );

  return { points, path, areaPath, gridLines, xLabels, yLabels, zeroLineY };
}
