import { cn } from '@/ui/utils/cn';

import { ChartLegend } from './ChartLegend';
import { CHART_DONUT_COLORS } from './chartTheme';

export type DonutSegment = {
  label: string;
  value: number;
};

type DonutChartProps = {
  segments: DonutSegment[];
  /** Center caption, e.g. "100%". */
  centerLabel: string;
  /** Ring diameter in px. */
  size?: number;
  /** Render the slice legend beside the ring. */
  showLegend?: boolean;
  ariaLabel?: string;
  className?: string;
};

/**
 * Data-driven donut. Slice colors come from the shared token ramp (accent first,
 * then neutral) so allocation stays quiet rather than turning into decoration.
 */
export function DonutChart({
  segments,
  centerLabel,
  size = 170,
  showLegend = true,
  ariaLabel,
  className,
}: DonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const safeTotal = total > 0 ? total : 1;
  const shares = segments.map((segment) => (Math.max(0, segment.value) / safeTotal) * 100);

  const slices = segments.map((_, index) => {
    const color = CHART_DONUT_COLORS[index % CHART_DONUT_COLORS.length];
    const start = shares.slice(0, index).reduce((sum, share) => sum + share, 0);
    const stop = `${color} ${start}% ${start + shares[index]}%`;
    return { color, percent: Math.round(shares[index]), stop };
  });

  const a11yProps =
    ariaLabel === undefined ? {} : { role: 'img' as const, 'aria-label': ariaLabel };

  return (
    <div className={cn('flex items-center gap-8', className)}>
      <div
        className="relative flex-none rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${slices.map((slice) => slice.stop).join(', ')})`,
        }}
        {...a11yProps}
      >
        <div
          className="absolute rounded-full bg-card"
          style={{ inset: `${Math.round(size * 0.21)}px` }}
        />
        <div className="absolute inset-0 flex items-center justify-center font-mono text-base tabular-nums text-foreground">
          {centerLabel}
        </div>
      </div>
      {showLegend && (
        <ChartLegend
          orientation="vertical"
          className="min-w-0 flex-1"
          items={segments.map((segment, index) => ({
            label: segment.label,
            color: slices[index].color,
            value: `${slices[index].percent}%`,
          }))}
        />
      )}
    </div>
  );
}
