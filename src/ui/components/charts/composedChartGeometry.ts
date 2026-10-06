/**
 * Geometry for `ComposedChart`: bars and lines sharing one plot, with optional
 * negative values (bars grow down from the zero baseline) and a second y scale
 * for series pinned to the right axis. Callers pass values and labels; the
 * scales, column positions, bar rects, line paths and axis ticks are derived
 * here so every composed chart in the app shares one layout algorithm.
 */
import { type ChartTone } from './chartTheme';
import { formatAxisValue } from './lineChartGeometry';

export const COMPOSED_CHART_WIDTH = 700;
export const COMPOSED_CHART_HEIGHT = 200;

const PADDING_TOP = 16;
const PADDING_BOTTOM = 16;
const PADDING_SIDE = 10;
const GRID_LINE_COUNT = 4;
const MAX_X_LABELS = 8;
/** Fraction of a column slot the whole bar group occupies. */
const COLUMN_FILL = 0.7;
/** Fraction of each bar slot left as a gap between neighbouring bars. */
const BAR_GAP = 0.14;
/** Padding added around the data range, as a fraction of the span. */
const RANGE_PAD = 0.06;

export type ComposedAxis = 'left' | 'right';

export type ComposedBarSeries = {
  kind: 'bar';
  tone: ChartTone;
  values: number[];
  axis?: ComposedAxis;
};

export type ComposedLineSeries = {
  kind: 'line';
  tone: ChartTone;
  values: number[];
  axis?: ComposedAxis;
  /** Fill the area between the line and the axis zero baseline. */
  area?: boolean;
  /**
   * Per-point baseline for the area fill. Omitted, the area fills down to the axis
   * zero baseline; supplied, the band sits between `values` and this line, which is
   * how stacked areas (e.g. income under investment return) are expressed.
   */
  baselineValues?: number[];
};

export type ComposedSeries = ComposedBarSeries | ComposedLineSeries;

export type ComposedReferenceLine = {
  /** Column index the vertical marker sits on. */
  index: number;
  tone?: ChartTone;
  /** Optional caption rendered above the marker. */
  label?: string;
};

export type ComposedColumn = {
  index: number;
  label: string;
  /** Column centre as a 0–1 fraction of the plot width. */
  xRatio: number;
  /** Smallest top ratio in the column (highest element), for tooltip anchoring. */
  topRatio: number;
};

export type ComposedBar = {
  key: string;
  tone: ChartTone;
  /** Source column index. */
  columnIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ComposedLine = {
  key: string;
  tone: ChartTone;
  path: string;
  areaPath?: string;
  /**
   * True when the band's baseline sits **above** its line on screen (a band below zero, or
   * one stacked under another). The gradient is anchored at the band's own line, so it has
   * to run bottom-up then, or full strength would land on the baseline instead of the line.
   */
  areaFlipped?: boolean;
  points: { xRatio: number; topRatio: number }[];
};

export type ComposedChartLayout = {
  columns: ComposedColumn[];
  bars: ComposedBar[];
  lines: ComposedLine[];
  /** Horizontal gridline y positions, in viewBox units (top to bottom). */
  gridLines: number[];
  leftLabels: { y: number; text: string }[];
  rightLabels: { y: number; text: string }[];
  /** y position of the left-axis zero baseline, present when the left axis is used. */
  zeroY?: number;
  referenceLines: { index: number; x: number; xRatio: number; tone: ChartTone; label?: string }[];
};

const EMPTY_LAYOUT: ComposedChartLayout = {
  columns: [],
  bars: [],
  lines: [],
  gridLines: [],
  leftLabels: [],
  rightLabels: [],
  referenceLines: [],
};

interface Scale {
  min: number;
  max: number;
}

/** Include 0 (bars need a baseline), then pad the range so the extremes breathe. */
const buildScale = (values: number[]): Scale => {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  if (min === max) {
    const pad = Math.abs(max || 1) * 0.1;
    return { min: min - pad, max: max + pad };
  }
  const pad = (max - min) * RANGE_PAD;
  return { min: min - pad, max: max + pad };
};

const innerHeight = COMPOSED_CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
const plotWidth = COMPOSED_CHART_WIDTH - PADDING_SIDE * 2;

const yFor = (value: number, scale: Scale): number => {
  const ratio = (value - scale.min) / (scale.max - scale.min);
  return PADDING_TOP + (1 - ratio) * innerHeight;
};

const gridValueAt = (scale: Scale, index: number): number => {
  const ratio = index / (GRID_LINE_COUNT - 1);
  return scale.max - ratio * (scale.max - scale.min);
};

const buildAxisLabels = (scale: Scale): { y: number; text: string }[] =>
  Array.from({ length: GRID_LINE_COUNT }, (_, index) => ({
    y: Number((PADDING_TOP + (index / (GRID_LINE_COUNT - 1)) * innerHeight).toFixed(2)),
    text: formatAxisValue(gridValueAt(scale, index)),
  }));

/**
 * Build the composed layout. `includeZero` is implicit for bars; lines share the
 * same axis scale as the bars they are plotted against, so a net-cash-flow line
 * and its income/expense bars read against one baseline.
 */
export function buildComposedGeometry(
  labels: string[],
  series: ComposedSeries[],
  referenceLines: ComposedReferenceLine[] = [],
): ComposedChartLayout {
  const count = labels.length;
  if (count === 0) return EMPTY_LAYOUT;

  const leftValues = series
    .filter((item) => (item.axis ?? 'left') === 'left')
    .flatMap((item) => item.values);
  const rightValues = series.filter((item) => item.axis === 'right').flatMap((item) => item.values);

  const leftScale = leftValues.length > 0 ? buildScale(leftValues) : undefined;
  const rightScale = rightValues.length > 0 ? buildScale(rightValues) : undefined;
  const primaryScale = leftScale ?? rightScale;
  if (!primaryScale) return EMPTY_LAYOUT;

  const scaleOf = (axis: ComposedAxis): Scale =>
    axis === 'right' ? (rightScale ?? primaryScale) : (leftScale ?? primaryScale);

  const columnWidth = plotWidth / count;
  const centerAt = (index: number): number => PADDING_SIDE + columnWidth * (index + 0.5);

  const barSeries = series.filter((item): item is ComposedBarSeries => item.kind === 'bar');
  const barSlot = barSeries.length > 0 ? (columnWidth * COLUMN_FILL) / barSeries.length : 0;
  const barWidth = barSlot * (1 - BAR_GAP);

  const bars: ComposedBar[] = [];
  barSeries.forEach((item, seriesIndex) => {
    const scale = scaleOf(item.axis ?? 'left');
    const zeroY = yFor(0, scale);
    const groupStart = centerAt(0) - (columnWidth * COLUMN_FILL) / 2;
    item.values.forEach((value, index) => {
      if (index >= count) return;
      const valueY = yFor(value, scale);
      const top = Math.min(valueY, zeroY);
      const height = Math.abs(valueY - zeroY);
      bars.push({
        key: `bar-${seriesIndex}-${index}`,
        tone: item.tone,
        columnIndex: index,
        x: Number(
          (
            groupStart +
            index * columnWidth +
            seriesIndex * barSlot +
            (barSlot - barWidth) / 2
          ).toFixed(2),
        ),
        y: Number(top.toFixed(2)),
        width: Number(barWidth.toFixed(2)),
        height: Number(Math.max(0.5, height).toFixed(2)),
      });
    });
  });

  const lineSeries = series.filter((item): item is ComposedLineSeries => item.kind === 'line');

  const lines: ComposedLine[] = lineSeries.map((item, seriesIndex) => {
    const scale = scaleOf(item.axis ?? 'left');
    const zeroY = yFor(0, scale);
    const coords = labels.map((_, index) => {
      const baseline = item.baselineValues?.[index];
      return {
        x: centerAt(index),
        y: yFor(item.values[index] ?? 0, scale),
        baselineY: baseline === undefined ? zeroY : yFor(baseline, scale),
      };
    });
    const path = coords
      .map(
        (point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
      )
      .join(' ');
    const first = coords[0];
    const last = coords[coords.length - 1];
    // Trace the baseline point by point when it varies: a stacked band's baseline is
    // another line, and closing with a single straight segment would cut across it and let
    // the band bleed into the one below. A flat baseline needs only its two corners.
    const flatBaseline = coords.every((point) => point.baselineY === first.baselineY);
    const baselineEdge = flatBaseline
      ? `L${last.x.toFixed(2)} ${last.baselineY.toFixed(2)} L${first.x.toFixed(2)} ${first.baselineY.toFixed(2)}`
      : [...coords]
          .reverse()
          .map((point) => `L${point.x.toFixed(2)} ${point.baselineY.toFixed(2)}`)
          .join(' ');
    const areaPath = item.area ? `${path} ${baselineEdge} Z` : undefined;
    const meanLineY = coords.reduce((total, point) => total + point.y, 0) / coords.length;
    const meanBaselineY =
      coords.reduce((total, point) => total + point.baselineY, 0) / coords.length;

    return {
      key: `line-${seriesIndex}`,
      tone: item.tone,
      path,
      ...(areaPath ? { areaPath } : {}),
      // The gradient is anchored at the band's own line, so a band whose baseline sits
      // above it on screen (below zero, or stacked under another) runs bottom-up.
      ...(areaPath ? { areaFlipped: meanBaselineY < meanLineY } : {}),
      points: coords.map(({ x, y }) => ({
        xRatio: Number((x / COMPOSED_CHART_WIDTH).toFixed(4)),
        topRatio: Number((y / COMPOSED_CHART_HEIGHT).toFixed(4)),
      })),
    };
  });

  const columns: ComposedColumn[] = labels.map((label, index) => {
    const candidates: number[] = [];
    bars.forEach((bar) => {
      if (bar.columnIndex === index) candidates.push(bar.y / COMPOSED_CHART_HEIGHT);
    });
    lines.forEach((line) => {
      const point = line.points[index];
      if (point) candidates.push(point.topRatio);
    });
    return {
      index,
      label,
      xRatio: Number((centerAt(index) / COMPOSED_CHART_WIDTH).toFixed(4)),
      topRatio: Number((candidates.length > 0 ? Math.min(...candidates) : 1).toFixed(4)),
    };
  });

  const gridLines = Array.from({ length: GRID_LINE_COUNT }, (_, index) =>
    Number((PADDING_TOP + (index / (GRID_LINE_COUNT - 1)) * innerHeight).toFixed(2)),
  );

  return {
    columns,
    bars,
    lines,
    gridLines,
    leftLabels: leftScale ? buildAxisLabels(leftScale) : [],
    rightLabels: rightScale ? buildAxisLabels(rightScale) : [],
    ...(leftScale ? { zeroY: Number(yFor(0, leftScale).toFixed(2)) } : {}),
    referenceLines: referenceLines
      .filter((line) => line.index >= 0 && line.index < count)
      .map((line) => ({
        index: line.index,
        x: Number(centerAt(line.index).toFixed(2)),
        xRatio: Number((centerAt(line.index) / COMPOSED_CHART_WIDTH).toFixed(4)),
        tone: line.tone ?? 'neutral',
        ...(line.label !== undefined ? { label: line.label } : {}),
      })),
  };
}

/** Column indices to render as x-axis labels (subset, always including the last). */
export function pickComposedXLabels(count: number): number[] {
  if (count === 0) return [];
  const step = Math.max(1, Math.ceil(count / MAX_X_LABELS));
  const indices: number[] = [];
  for (let index = 0; index < count; index += step) indices.push(index);
  if (indices[indices.length - 1] !== count - 1) indices.push(count - 1);
  return indices;
}
