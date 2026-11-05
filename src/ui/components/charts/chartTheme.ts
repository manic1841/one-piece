/** Shared chart vocabulary: tone → color and the donut slice ramp. */

export type ChartTone =
  | 'primary'
  | 'positive'
  | 'negative'
  | 'neutral'
  /** Investment return: `--warning` (amber). */
  | 'investment'
  /** Long-horizon stock (net worth): `--chart-1` (blue). */
  | 'asset'
  /** Provisional-data markers: `--warning` (amber). */
  | 'warning';

/** SVG stroke/fill colors, kept as token references so the palette stays in one place. */
export const CHART_TONE_COLOR: Record<ChartTone, string> = {
  primary: 'hsl(var(--primary))',
  positive: 'hsl(var(--positive))',
  negative: 'hsl(var(--negative))',
  neutral: 'hsl(var(--border-strong))',
  investment: 'hsl(var(--warning))',
  asset: 'hsl(var(--chart-1))',
  warning: 'hsl(var(--warning))',
};

/**
 * Categorical token for charts that encode a category instead of a state. The
 * color still arrives through `--chart-*`, but it does not claim a semantic tone.
 * See ADR-0081.
 */
export type ChartColorToken =
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5'
  | 'chart-6'
  | 'chart-7';

export const CHART_COLOR_TOKEN_COLOR: Record<ChartColorToken, string> = {
  'chart-1': 'hsl(var(--chart-1))',
  'chart-2': 'hsl(var(--chart-2))',
  'chart-3': 'hsl(var(--chart-3))',
  'chart-4': 'hsl(var(--chart-4))',
  'chart-5': 'hsl(var(--chart-5))',
  'chart-6': 'hsl(var(--chart-6))',
  'chart-7': 'hsl(var(--chart-7))',
};

/** Background utilities for solid bars and legend swatches. */
export const CHART_TONE_FILL: Record<ChartTone, string> = {
  primary: 'bg-primary',
  positive: 'bg-positive/70',
  negative: 'bg-negative/60',
  neutral: 'bg-border-strong',
  investment: 'bg-warning/70',
  asset: 'bg-chart-1/70',
  warning: 'bg-warning/70',
};

/**
 * Categorical palette for pie/donut breakdowns: encodes *which category*, not
 * data state. Brand teal leads, then the `--chart-*` ramp by data order. No red
 * (reserved for `--negative`). See ADR-0081.
 */
export const CHART_DONUT_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
  'hsl(var(--chart-7))',
];
