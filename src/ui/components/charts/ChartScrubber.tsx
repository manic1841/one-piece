import * as React from 'react';

import { type ChartPoint, describePoint, useChartScrubber } from './chartInteraction';

type ChartScrubberProps = {
  /** Number of reachable points. */
  count: number;
  /** Rendered plot height in px, for the tooltip allowance. */
  plotHeight: number;
  /** One point per index; supplies `aria-valuetext`. */
  points: ChartPoint[];
  ariaLabel: string;
  className: string;
  /** Maps a pointer position to a point index, or -1 to leave the active point unchanged. */
  resolveIndex: (event: React.MouseEvent<HTMLDivElement>, count: number) => number;
  children: (scrubber: ReturnType<typeof useChartScrubber>) => React.ReactNode;
};

/**
 * The interactive layer shared by `InteractiveLineChart` and `InteractiveBarChart`:
 * one slider surface, one keyboard contract, one `aria-valuetext`. Charts pass
 * how to map the pointer to an index, and render their own guide/dot/tooltip
 * from the scrubber state.
 */
export const ChartScrubber: React.FC<ChartScrubberProps> = ({
  count,
  plotHeight,
  points,
  ariaLabel,
  className,
  resolveIndex,
  children,
}) => {
  const scrubber = useChartScrubber(count, plotHeight);
  const { active, setActive, clear, handleKeyDown } = scrubber;

  if (count === 0) return null;

  const tip = active === null ? undefined : points[active];

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={count - 1}
      aria-valuenow={active ?? 0}
      aria-valuetext={tip === undefined ? undefined : describePoint(tip)}
      className={className}
      onMouseMove={(event) => {
        const index = resolveIndex(event, count);
        if (index !== -1) setActive(index);
      }}
      onMouseLeave={clear}
      onKeyDown={handleKeyDown}
    >
      {children(scrubber)}
    </div>
  );
};
