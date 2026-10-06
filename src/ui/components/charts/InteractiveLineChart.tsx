import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { ChartScrubber } from './ChartScrubber';
import { ChartTooltip } from './ChartTooltip';
import { LineChart } from './LineChart';
import { type ChartPoint, clampIndex, shouldFlipTooltip } from './chartInteraction';
import type { ChartTone } from './chartTheme';
import type { LineChartGeometry } from './lineChartGeometry';

type InteractiveLineChartProps = {
  values: number[];
  /** One point per value; the tooltip content for each index. */
  points: ChartPoint[];
  /** Axis labels (usually a subset, always including the last). */
  xLabels?: string[];
  tone?: ChartTone;
  /** Pin the y range to include 0 (see `LineChart`). */
  includeZero?: boolean;
  /** Render y value labels down the left edge (see `LineChart`). */
  yAxis?: 'none' | 'left';
  /** Rendered plot height in px. */
  height?: number;
  ariaLabel: string;
  className?: string;
};

const ChartHoverLayer: React.FC<{
  geometry: LineChartGeometry;
  points: ChartPoint[];
  ariaLabel: string;
  plotHeight: number;
}> = ({ geometry, points, ariaLabel, plotHeight }) => {
  const count = geometry.points.length;

  const resolveIndex = (event: React.MouseEvent<HTMLDivElement>, length: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return -1;
    const ratio = (event.clientX - rect.left) / rect.width;
    return clampIndex(Math.round(ratio * (length - 1)), length);
  };

  return (
    <ChartScrubber
      count={count}
      plotHeight={plotHeight}
      points={points}
      ariaLabel={ariaLabel}
      className="absolute inset-0 cursor-crosshair outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      resolveIndex={resolveIndex}
    >
      {({ active, tooltipRef, allowedTopRatio }) => {
        const point = active === null ? undefined : geometry.points[active];
        const tip = active === null ? undefined : points[active];
        if (point === undefined) return null;
        const flipped = shouldFlipTooltip(point.xRatio);

        return (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-px bg-border-strong"
              style={{ left: `${point.xRatio * 100}%` }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-card"
              style={{ left: `${point.xRatio * 100}%`, top: `${point.topRatio * 100}%` }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
              style={{ left: `${point.xRatio * 100}%`, top: `${point.topRatio * 100}%` }}
            />
            {tip !== undefined && (
              <ChartTooltip
                ref={tooltipRef}
                title={tip.title}
                value={tip.value}
                meta={tip.meta}
                className={cn('absolute z-10 -mt-3', flipped ? '-ml-3.5' : 'ml-3.5')}
                style={{
                  left: `${point.xRatio * 100}%`,
                  top: `${Math.max(point.topRatio, allowedTopRatio) * 100}%`,
                  transform: flipped ? 'translate(-100%, -100%)' : 'translate(0, -100%)',
                }}
              />
            )}
          </>
        );
      }}
    </ChartScrubber>
  );
};

/**
 * `LineChart` with a hover/keyboard scrubber: guide line, point dot, and the
 * shared `ChartTooltip` card. The plot is a slider so the same data is reachable
 * with arrow keys, not hover only.
 */
export function InteractiveLineChart({
  values,
  points,
  xLabels = [],
  tone = 'primary',
  includeZero,
  yAxis,
  height = 170,
  ariaLabel,
  className,
}: InteractiveLineChartProps) {
  return (
    <LineChart
      values={values}
      labels={xLabels}
      tone={tone}
      showArea
      markLastPoint
      includeZero={includeZero}
      yAxis={yAxis}
      height={height}
      className={className}
    >
      {(geometry) => (
        <ChartHoverLayer
          geometry={geometry}
          points={points}
          ariaLabel={ariaLabel}
          plotHeight={height}
        />
      )}
    </LineChart>
  );
}
