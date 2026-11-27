import { cn } from '@/ui/utils/cn';

import { ChartLegend } from './ChartLegend';
import { type DonutSegment, buildDonutSlices } from './donutSlices';

export type { DonutSegment } from './donutSlices';

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
  const slices = buildDonutSlices(segments);

  const a11yProps =
    ariaLabel === undefined ? {} : { role: 'img' as const, 'aria-label': ariaLabel };

  // Phones stack the legend under the ring: side by side the fixed 170px ring
  // squeezes the legend to a sliver and the centre caption spills onto the ring.
  return (
    <div className={cn('flex flex-col items-center gap-4 sm:flex-row sm:gap-8', className)}>
      <div
        className="relative aspect-square w-full flex-none"
        style={{ maxWidth: size }}
        {...a11yProps}
      >
        {/* The ring is masked by an animating stop angle, so it sweeps in
            clockwise (motion-system §5.7). The hole and the caption are siblings
            rather than children: a mask would otherwise eat into them too. */}
        <div
          className="absolute inset-0 rounded-full animate-chart-sweep"
          style={{
            background: `conic-gradient(${slices.map((slice) => slice.stop).join(', ')})`,
            maskImage: 'conic-gradient(#000 var(--chart-sweep), transparent 0)',
            WebkitMaskImage: 'conic-gradient(#000 var(--chart-sweep), transparent 0)',
          }}
        />
        <div className="absolute rounded-full bg-card" style={{ inset: '21%' }} />
        <div className="absolute inset-0 flex items-center justify-center px-1 font-mono text-sm tabular-nums text-foreground">
          {centerLabel}
        </div>
      </div>
      {showLegend && (
        <ChartLegend
          orientation="vertical"
          className="w-full min-w-0 sm:flex-1"
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
