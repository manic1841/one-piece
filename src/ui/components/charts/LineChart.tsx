import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { ChartAxisGutter } from './ChartAxisGutter';
import { ChartXLabelRow } from './ChartXLabelRow';
import { CHART_TONE_COLOR, type ChartTone } from './chartTheme';
import {
  LINE_CHART_HEIGHT,
  LINE_CHART_WIDTH,
  type LineChartGeometry,
  buildLineGeometry,
} from './lineChartGeometry';
import { useMeasuredWidth } from './useMeasuredWidth';
import { xLabelBudget } from './xLabels';

type LineChartProps = {
  /** Ordered series values. The y scale is padded around the data range. */
  values: number[];
  /** One label per value; rendered as the x axis (a subset, always including the last). */
  labels?: string[];
  tone?: ChartTone;
  /** Draw a soft area under the line. */
  showArea?: boolean;
  /** Mark the final point with a dot. */
  markLastPoint?: boolean;
  /** Pin the y scale to include 0 (0-baseline charts). */
  includeZero?: boolean;
  /** Draw a dashed line where the value is 0 (needs 0 inside the scale). */
  zeroLine?: boolean;
  /** Render the value labels in a gutter left of the plot. */
  yAxis?: 'none' | 'left';
  /** Rendered plot height in px. */
  height?: number;
  ariaLabel?: string;
  className?: string;
  /** Overlay renderer (hover guide, tooltip) drawn inside the plot area. */
  children?: (geometry: LineChartGeometry) => React.ReactNode;
};

/** Below this plot height there is no room for four tick labels. */
const SHORT_PLOT_HEIGHT = 140;

/**
 * Data-driven line chart: gridlines, optional area, axis labels. Pair with `InteractiveLineChart` for hover.
 *
 * The y labels live in a gutter beside the plot rather than over it, so the line
 * and the area never run through a tick. Overlays stay inside the plot, which
 * keeps their pointer geometry plot-local.
 */
export function LineChart({
  values,
  labels = [],
  tone = 'primary',
  showArea = false,
  markLastPoint = false,
  includeZero = false,
  zeroLine = false,
  yAxis = 'none',
  height = 150,
  ariaLabel,
  className,
  children,
}: LineChartProps) {
  const [plotRef, plotWidth] = useMeasuredWidth<HTMLDivElement>();

  const geometry = buildLineGeometry(values, labels, {
    maxXLabels: xLabelBudget(plotWidth),
    yTicks: height < SHORT_PLOT_HEIGHT ? 3 : undefined,
    includeZero,
  });
  const color = CHART_TONE_COLOR[tone];
  const last = geometry.points[geometry.points.length - 1];
  // A single point has no line to grow; leave it already settled.
  const revealing = geometry.points.length > 1;
  const clipId = `line-reveal-${React.useId().replace(/:/g, '')}`;
  const a11yProps =
    ariaLabel === undefined ? {} : { role: 'img' as const, 'aria-label': ariaLabel };
  const showAxis = yAxis === 'left' && geometry.yLabels.length > 0;

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex">
        {showAxis && (
          <ChartAxisGutter
            side="left"
            labels={geometry.yLabels}
            height={height}
            viewBoxHeight={LINE_CHART_HEIGHT}
          />
        )}

        <div ref={plotRef} className="relative min-w-0 flex-1">
          <div className="relative" style={{ height }} {...a11yProps}>
            <svg
              className="block h-full w-full"
              viewBox={`0 0 ${LINE_CHART_WIDTH} ${LINE_CHART_HEIGHT}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {geometry.gridLines.map((y, index) => (
                <line
                  key={index}
                  x1={0}
                  x2={LINE_CHART_WIDTH}
                  y1={y}
                  y2={y}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                />
              ))}
              {zeroLine && geometry.zeroLineY !== undefined && (
                <line
                  x1={0}
                  x2={LINE_CHART_WIDTH}
                  y1={geometry.zeroLineY}
                  y2={geometry.zeroLineY}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              )}
              {revealing && (
                <defs>
                  <clipPath id={clipId}>
                    {/* `fill-box` + bottom origin makes the rect grow upward from the
                        baseline. Scaling a clip leaves the stroke width untouched. */}
                    <rect
                      className="animate-chart-reveal [transform-box:fill-box] [transform-origin:bottom]"
                      x={0}
                      y={0}
                      width={LINE_CHART_WIDTH}
                      height={LINE_CHART_HEIGHT}
                    />
                  </clipPath>
                </defs>
              )}
              <g clipPath={revealing ? `url(#${clipId})` : undefined}>
                {showArea && (
                  <path d={geometry.areaPath} fill={color} stroke="none" opacity={0.07} />
                )}
                <path
                  d={geometry.path}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {markLastPoint && last !== undefined && (
                  <circle cx={last.x} cy={last.y} r={4} fill={color} />
                )}
              </g>
            </svg>
            {children?.(geometry)}
          </div>
        </div>
      </div>

      {geometry.xLabels.length > 0 && (
        <ChartXLabelRow
          testId="line-chart-x-labels"
          leftGutter={showAxis}
          rightGutter={false}
          labels={geometry.xLabels.map((label) => ({
            xRatio: label.x / LINE_CHART_WIDTH,
            text: label.text,
          }))}
        />
      )}
    </div>
  );
}
