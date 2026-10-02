import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { CHART_TONE_COLOR, type ChartTone } from './chartTheme';
import {
  LINE_CHART_HEIGHT,
  LINE_CHART_WIDTH,
  type LineChartGeometry,
  buildLineGeometry,
} from './lineChartGeometry';

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
  /** Rendered plot height in px. */
  height?: number;
  ariaLabel?: string;
  className?: string;
  /** Overlay renderer (hover guide, tooltip) drawn inside the plot area. */
  children?: (geometry: LineChartGeometry) => React.ReactNode;
};

/** Data-driven line chart: gridlines, optional area, axis labels. Pair with `InteractiveLineChart` for hover. */
export function LineChart({
  values,
  labels = [],
  tone = 'primary',
  showArea = false,
  markLastPoint = false,
  height = 150,
  ariaLabel,
  className,
  children,
}: LineChartProps) {
  const geometry = buildLineGeometry(values, labels);
  const color = CHART_TONE_COLOR[tone];
  const last = geometry.points[geometry.points.length - 1];
  const a11yProps =
    ariaLabel === undefined ? {} : { role: 'img' as const, 'aria-label': ariaLabel };

  return (
    <div className={cn('relative', className)}>
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
          {showArea && <path d={geometry.areaPath} fill={color} stroke="none" opacity={0.07} />}
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
        </svg>
        {children?.(geometry)}
      </div>
      {geometry.xLabels.length > 0 && (
        <div className="relative mt-2 h-4">
          {geometry.xLabels.map((label, index) => (
            <span
              key={`${label.text}-${index}`}
              className="absolute whitespace-nowrap font-mono text-[10px] tabular-nums text-muted-foreground"
              style={{
                left: `${(label.x / LINE_CHART_WIDTH) * 100}%`,
                transform:
                  index === 0
                    ? 'none'
                    : index === geometry.xLabels.length - 1
                      ? 'translateX(-100%)'
                      : 'translateX(-50%)',
              }}
            >
              {label.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
