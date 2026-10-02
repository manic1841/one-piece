import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { BarChart, type BarChartLayout, type BarChartSeries } from './BarChart';
import { ChartTooltip } from './ChartTooltip';
import {
  type ChartPoint,
  clampIndex,
  describePoint,
  useTooltipAllowance,
} from './chartInteraction';

type InteractiveBarChartProps = {
  labels: string[];
  series: BarChartSeries[];
  /** One point per column; the tooltip content for each index. */
  points: ChartPoint[];
  highlightIndex?: number;
  height?: number;
  showLabels?: boolean;
  ariaLabel: string;
  className?: string;
};

/**
 * Hover layer over the bar area. It mirrors the area's flex classes so each
 * target lines up with a column without measuring pixels, and reads the column
 * from the pointer's position across its own children.
 */
const BarHoverLayer: React.FC<{
  layout: BarChartLayout;
  points: ChartPoint[];
  ariaLabel: string;
  plotHeight: number;
}> = ({ layout, points, ariaLabel, plotHeight }) => {
  const count = layout.columns.length;
  const [active, setActive] = React.useState<number | null>(null);
  const { ref: tooltipRef, allowedTopRatio } = useTooltipAllowance(plotHeight, active);

  if (count === 0) return null;

  const tip = active === null ? undefined : points[active];

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const targets = Array.from(event.currentTarget.children) as HTMLElement[];
    const hit = targets.findIndex((target) => {
      const rect = target.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right;
    });
    if (hit !== -1) setActive(hit);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      setActive(clampIndex((active ?? -1) + step, count));
      return;
    }
    if (event.key === 'Escape') setActive(null);
  };

  /** Anchor classes + transform per column: centred, or pinned to the edge column. */
  const placement = (index: number): { className: string; transform: string } => {
    const lift = 'translateY(calc(-100% - 12px))';
    if (index === 0) return { className: 'left-0', transform: lift };
    if (index === count - 1) return { className: 'right-0', transform: lift };
    return { className: 'left-1/2', transform: `translateX(-50%) ${lift}` };
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={count - 1}
      aria-valuenow={active ?? 0}
      aria-valuetext={tip === undefined ? undefined : describePoint(tip)}
      className="absolute inset-0 flex cursor-crosshair items-stretch gap-3.5 px-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      onMouseMove={handleMove}
      onMouseLeave={() => setActive(null)}
      onKeyDown={handleKeyDown}
    >
      {layout.columns.map((column, index) => {
        const anchor = placement(index);
        return (
          <div key={column.label} className="relative flex-1" aria-hidden="true">
            {active === index && tip !== undefined && (
              <>
                <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border-strong" />
                <ChartTooltip
                  ref={tooltipRef}
                  title={tip.title}
                  value={tip.value}
                  meta={tip.meta}
                  className={cn('absolute z-10', anchor.className)}
                  style={{
                    top: `${Math.max(1 - column.ratio, allowedTopRatio) * 100}%`,
                    transform: anchor.transform,
                  }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * `BarChart` with a hover/keyboard scrubber: a full-height guide and the shared
 * `ChartTooltip` card. The area is a slider so every column is reachable with
 * arrow keys, not hover only.
 */
export function InteractiveBarChart({
  labels,
  series,
  points,
  highlightIndex,
  height = 165,
  showLabels = true,
  ariaLabel,
  className,
}: InteractiveBarChartProps) {
  return (
    <BarChart
      labels={labels}
      series={series}
      highlightIndex={highlightIndex}
      height={height}
      showLabels={showLabels}
      className={className}
    >
      {(layout) => (
        <BarHoverLayer layout={layout} points={points} ariaLabel={ariaLabel} plotHeight={height} />
      )}
    </BarChart>
  );
}
