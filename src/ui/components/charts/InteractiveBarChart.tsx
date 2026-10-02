import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { BarChart, type BarChartLayout, type BarChartSeries } from './BarChart';
import { ChartScrubber } from './ChartScrubber';
import { ChartTooltip } from './ChartTooltip';
import type { ChartPoint } from './chartInteraction';

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

/** Anchor classes + transform per column: centred, or pinned to the edge column. */
const placement = (index: number, count: number): { className: string; transform: string } => {
  const lift = 'translateY(calc(-100% - 12px))';
  if (index === 0) return { className: 'left-0', transform: lift };
  if (index === count - 1) return { className: 'right-0', transform: lift };
  return { className: 'left-1/2', transform: `translateX(-50%) ${lift}` };
};

/**
 * Hover layer over the bar area. It mirrors the area's flex classes so each
 * child lands exactly on a column, then reads the column straight off the
 * pointer's position rather than computing ratios.
 */
const BarHoverLayer: React.FC<{
  layout: BarChartLayout;
  points: ChartPoint[];
  ariaLabel: string;
  plotHeight: number;
}> = ({ layout, points, ariaLabel, plotHeight }) => {
  const count = layout.columns.length;

  const resolveIndex = (event: React.MouseEvent<HTMLDivElement>) => {
    const targets = Array.from(event.currentTarget.children) as HTMLElement[];
    return targets.findIndex((target) => {
      const rect = target.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right;
    });
  };

  return (
    <ChartScrubber
      count={count}
      plotHeight={plotHeight}
      points={points}
      ariaLabel={ariaLabel}
      className="absolute inset-0 flex cursor-crosshair items-stretch gap-3.5 px-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      resolveIndex={resolveIndex}
    >
      {({ active, tooltipRef, allowedTopRatio }) =>
        layout.columns.map((column, index) => {
          const anchor = placement(index, count);
          const tip = active === index ? points[index] : undefined;
          return (
            <div key={column.label} className="relative flex-1" aria-hidden="true">
              {tip !== undefined && (
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
        })
      }
    </ChartScrubber>
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
