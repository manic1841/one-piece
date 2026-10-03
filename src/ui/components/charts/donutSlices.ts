import { CHART_DONUT_COLORS } from './chartTheme';

export type DonutSegment = {
  label: string;
  value: number;
};

export type DonutSlice = {
  color: string;
  /** Rounded share of the total, e.g. 42. */
  percent: number;
  /** Conic-gradient stop, e.g. `hsl(var(--primary)) 0% 42%`. */
  stop: string;
};

/**
 * Pure slice math for the donut: shares of the non-negative total, a token color
 * per slice, and its conic-gradient stop. Kept out of the component so the
 * geometry can be asserted without a CSS engine having to parse `conic-gradient`.
 */
export function buildDonutSlices(segments: DonutSegment[]): DonutSlice[] {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const safeTotal = total > 0 ? total : 1;
  const shares = segments.map((segment) => (Math.max(0, segment.value) / safeTotal) * 100);

  return segments.map((_, index) => {
    const color = CHART_DONUT_COLORS[index % CHART_DONUT_COLORS.length];
    const start = shares.slice(0, index).reduce((sum, share) => sum + share, 0);
    return {
      color,
      percent: Math.round(shares[index]),
      stop: `${color} ${start}% ${start + shares[index]}%`,
    };
  });
}
