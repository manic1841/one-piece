/** Shared chart vocabulary: tone → color and the donut slice ramp. */

export type ChartTone = 'primary' | 'positive' | 'negative' | 'neutral';

/** SVG stroke/fill colors, kept as token references so the palette stays in one place. */
export const CHART_TONE_COLOR: Record<ChartTone, string> = {
  primary: 'hsl(var(--primary))',
  positive: 'hsl(var(--positive))',
  negative: 'hsl(var(--negative))',
  neutral: 'hsl(var(--border-strong))',
};

/** Background utilities for solid bars and legend swatches. */
export const CHART_TONE_FILL: Record<ChartTone, string> = {
  primary: 'bg-primary',
  positive: 'bg-positive/70',
  negative: 'bg-negative/60',
  neutral: 'bg-border-strong',
};

/** Donut slice ramp: the accent carries the first slice, the rest stay neutral (never decorative). */
export const CHART_DONUT_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--border-strong))',
  'hsl(var(--border))',
  'hsl(var(--muted))',
  'hsl(var(--elevated))',
];
