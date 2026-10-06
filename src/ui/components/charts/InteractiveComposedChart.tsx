import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { ChartScrubber } from './ChartScrubber';
import { ChartTooltip } from './ChartTooltip';
import { ComposedChart } from './ComposedChart';
import { type ChartPoint, clampIndex } from './chartInteraction';
import { type ComposedReferenceLine, type ComposedSeries } from './composedChartGeometry';

type InteractiveComposedChartProps = {
  labels: string[];
  series: ComposedSeries[];
  referenceLines?: ComposedReferenceLine[];
  /** One point per column; the tooltip content for each index. */
  points: ChartPoint[];
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
 * `ComposedChart` with a hover/keyboard scrubber: a full-height guide and the
 * shared `ChartTooltip` card. Columns are read straight off the pointer's x
 * position so every column is reachable with arrow keys, not hover only.
 */
export function InteractiveComposedChart({
  labels,
  series,
  referenceLines,
  points,
  height = 200,
  showLabels = true,
  ariaLabel,
  className,
}: InteractiveComposedChartProps) {
  const count = labels.length;

  const resolveIndex = (event: React.MouseEvent<HTMLDivElement>, columns: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || columns === 0) return -1;
    const ratio = (event.clientX - rect.left) / rect.width;
    return clampIndex(Math.floor(ratio * columns), columns);
  };

  return (
    <ComposedChart
      labels={labels}
      series={series}
      referenceLines={referenceLines}
      height={height}
      showLabels={showLabels}
      className={className}
    >
      {(layout) => (
        <ChartScrubber
          count={count}
          plotHeight={height}
          points={points}
          ariaLabel={ariaLabel}
          className="absolute inset-0 flex cursor-crosshair items-stretch outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          resolveIndex={resolveIndex}
        >
          {({ active, tooltipRef, allowedTopRatio }) => {
            const column = active === null ? undefined : layout.columns[active];
            const tip = active === null ? undefined : points[active];
            if (column === undefined) return null;
            const anchor = placement(column.index, layout.columns.length);

            return (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-px bg-border-strong"
                  style={{ left: `${column.xRatio * 100}%` }}
                />
                {tip !== undefined && (
                  <ChartTooltip
                    ref={tooltipRef}
                    title={tip.title}
                    value={tip.value}
                    meta={tip.meta}
                    className={cn('absolute z-10', anchor.className)}
                    style={{
                      top: `${Math.max(column.topRatio, allowedTopRatio) * 100}%`,
                      transform: anchor.transform,
                    }}
                  />
                )}
              </>
            );
          }}
        </ChartScrubber>
      )}
    </ComposedChart>
  );
}
