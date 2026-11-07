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
  /** Sweep the ring open when the chart first renders (motion-system §5.7). */
  reveal?: boolean;
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
  reveal = true,
  ariaLabel,
  className,
}: DonutChartProps) {
  const slices = buildDonutSlices(segments);

  const a11yProps =
    ariaLabel === undefined ? {} : { role: 'img' as const, 'aria-label': ariaLabel };

  return (
    <div className={cn('flex items-center gap-8', className)}>
      <div className="relative flex-none" style={{ width: size, height: size }} {...a11yProps}>
        {/* The ring is masked by an animating stop angle, so it sweeps in
            clockwise (motion-system §5.7). The hole and the caption are siblings
            rather than children: a mask would otherwise eat into them too. */}
        <div
          className={cn('absolute inset-0 rounded-full', reveal && 'animate-chart-sweep')}
          style={{
            background: `conic-gradient(${slices.map((slice) => slice.stop).join(', ')})`,
            maskImage: 'conic-gradient(#000 var(--chart-sweep), transparent 0)',
            WebkitMaskImage: 'conic-gradient(#000 var(--chart-sweep), transparent 0)',
          }}
        />
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
