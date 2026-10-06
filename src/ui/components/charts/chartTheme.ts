/** Shared chart vocabulary: tone → color and the donut slice ramp. */

export type ChartTone =
  | 'primary'
  | 'positive'
  | 'negative'
  | 'neutral'
  /** Investment return: `--warning` (amber). */
  | 'investment'
  /** Long-horizon stock (net worth): `--chart-1` (blue). */
  | 'asset';

/** SVG stroke/fill colors, kept as token references so the palette stays in one place. */
export const CHART_TONE_COLOR: Record<ChartTone, string> = {
  primary: 'hsl(var(--primary))',
  positive: 'hsl(var(--positive))',
  negative: 'hsl(var(--negative))',
  neutral: 'hsl(var(--border-strong))',
  investment: 'hsl(var(--warning))',
  asset: 'hsl(var(--chart-1))',
};

/** Background utilities for solid bars and legend swatches. */
export const CHART_TONE_FILL: Record<ChartTone, string> = {
  primary: 'bg-primary',
  positive: 'bg-positive/70',
  negative: 'bg-negative/60',
  neutral: 'bg-border-strong',
  investment: 'bg-warning/70',
  asset: 'bg-chart-1/70',
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
