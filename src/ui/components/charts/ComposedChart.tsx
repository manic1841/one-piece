import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { ChartAxisGutter } from './ChartAxisGutter';
import { ChartXLabelRow } from './ChartXLabelRow';
import { labelZeroBaseline } from './axisLabels';
import { CHART_COLOR_TOKEN_COLOR, CHART_TONE_COLOR } from './chartTheme';
import {
  COMPOSED_CHART_HEIGHT,
  COMPOSED_CHART_WIDTH,
  type ComposedChartLayout,
  type ComposedReferenceLine,
  type ComposedSeries,
  buildComposedGeometry,
} from './composedChartGeometry';
import { useMeasuredWidth } from './useMeasuredWidth';
import { pickXLabels, shortenXLabels, xLabelBudget } from './xLabels';

const BAR_FILL_OPACITY = 0.6;
/**
 * Area fill: a single-colour gradient at full strength where the band meets its own line,
 * fading to nothing at the band's baseline (ADR-0078). Decorative gradients remain banned —
 * this one carries which line an area belongs to.
 */
const AREA_GRADIENT_OPACITY = 0.38;
const LINE_STROKE_WIDTH = 1.8;
const DASHED_LINE_STROKE_WIDTH = 1.2;

type ComposedChartProps = {
  labels: string[];
  series: ComposedSeries[];
  /** Vertical markers (e.g. the retirement year). */
  referenceLines?: ComposedReferenceLine[];
  /** Rendered plot height in px. */
  height?: number;
  /** Fixed y domain, e.g. `{ min: 0, max: 100 }` for a percentage axis. */
  yDomain?: { min: number; max: number };
  /** Gridline and tick count. Defaults to 4. */
  yTicks?: number;
  /** Fixed tick decimals; use for narrow domains where rounding would repeat labels. */
  yDecimals?: number;
  /** Suffix appended to every left tick label, e.g. `%`. */
  yUnit?: string;
  /** Pin a line-only scale to include the zero baseline. */
  includeZero?: boolean;
  showLabels?: boolean;
  ariaLabel?: string;
  className?: string;
  /** Overlay renderer (hover guide, tooltip) drawn inside the plot area. */
  children?: (layout: ComposedChartLayout) => React.ReactNode;
};

/**
 * Bars and lines sharing one plot: grouped bars (which may go negative from the
 * zero baseline) plus optional lines, with an optional second y scale on the
 * right. Values and labels come from the caller; geometry, scales and axis ticks
 * are derived in `composedChartGeometry`. Colors stay on the shared tone tokens.
 */
export function ComposedChart({
  labels,
  series,
  referenceLines = [],
  height = COMPOSED_CHART_HEIGHT,
  yDomain,
  yTicks,
  yDecimals,
  yUnit,
  includeZero,
  showLabels = true,
  ariaLabel,
  className,
  children,
}: ComposedChartProps) {
  const layout = buildComposedGeometry(labels, series, referenceLines, {
    ...(yDomain === undefined ? {} : { yDomain }),
    ...(yTicks === undefined ? {} : { yTicks }),
    ...(yDecimals === undefined ? {} : { yDecimals }),
    ...(includeZero === undefined ? {} : { includeZero }),
  });
  const seriesColor = (item: {
    tone: keyof typeof CHART_TONE_COLOR;
    colorToken?: keyof typeof CHART_COLOR_TOKEN_COLOR;
  }) =>
    item.colorToken === undefined
      ? CHART_TONE_COLOR[item.tone]
      : CHART_COLOR_TOKEN_COLOR[item.colorToken];
  const leftLabels = labelZeroBaseline(layout.leftLabels, layout.zeroY);
  const rightLabels = labelZeroBaseline(layout.rightLabels, layout.rightZeroY);
  const [containerRef, width] = useMeasuredWidth<HTMLDivElement>();
  const xLabels = shortenXLabels(labels, pickXLabels(labels.length, xLabelBudget(width)));
  // Gradient ids must be unique per chart instance, or a second chart on the page reuses the first.
  const gradientIdPrefix = React.useId().replace(/:/g, '');
  const a11yProps =
    ariaLabel === undefined || children !== undefined
      ? {}
      : { role: 'img' as const, 'aria-label': ariaLabel };
  // Bars can be negative, so the series grows out of the zero line in both
  // directions rather than off the bottom edge. `view-box` makes the origin
  // resolve against the plot, not the group's own box.
  const revealOrigin = {
    transformBox: 'view-box' as const,
    transformOrigin: `0 ${layout.zeroY ?? COMPOSED_CHART_HEIGHT}px`,
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex">
        {leftLabels.length > 0 && (
          <ChartAxisGutter
            side="left"
            labels={
              yUnit === undefined
                ? leftLabels
                : leftLabels.map((label) => ({ ...label, text: `${label.text}${yUnit}` }))
            }
            height={height}
            viewBoxHeight={COMPOSED_CHART_HEIGHT}
          />
        )}

        <div ref={containerRef} className="min-w-0 flex-1">
          <div className="relative" style={{ height }} {...a11yProps}>
            <svg
              className="block h-full w-full"
              viewBox={`0 0 ${COMPOSED_CHART_WIDTH} ${COMPOSED_CHART_HEIGHT}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                {layout.lines.map((line, index) =>
                  line.areaPath === undefined ? null : (
                    <linearGradient
                      key={`area-gradient-${index}`}
                      id={`${gradientIdPrefix}-area-${index}`}
                      x1="0"
                      y1={line.areaFlipped ? '1' : '0'}
                      x2="0"
                      y2={line.areaFlipped ? '0' : '1'}
                    >
                      <stop
                        offset="0%"
                        stopColor={seriesColor(line)}
                        stopOpacity={AREA_GRADIENT_OPACITY}
                      />
                      <stop offset="100%" stopColor={seriesColor(line)} stopOpacity={0} />
                    </linearGradient>
                  ),
                )}
              </defs>
              {layout.gridLines.map((y) => (
                <line
                  key={`grid-${y}`}
                  x1={0}
                  x2={COMPOSED_CHART_WIDTH}
                  y1={y}
                  y2={y}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {layout.zeroY !== undefined && (
                <line
                  x1={0}
                  x2={COMPOSED_CHART_WIDTH}
                  y1={layout.zeroY}
                  y2={layout.zeroY}
                  stroke="hsl(var(--border-strong))"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {/* Only the data grows; grid, zero line and reference lines are
              already in place, so the marker stays put while the series rises
              to meet it. `non-scaling-stroke` on the lines is what makes the
              scale safe — the stroke width never stretches with the group. */}
              <g className="animate-chart-reveal" style={revealOrigin}>
                {layout.lines.map((line, index) =>
                  line.areaPath ? (
                    <path
                      key={`area-${line.key}`}
                      d={line.areaPath}
                      fill={`url(#${gradientIdPrefix}-area-${index})`}
                      stroke="none"
                    />
                  ) : null,
                )}
                {layout.bars.map((bar) => (
                  <rect
                    key={bar.key}
                    x={bar.x}
                    y={bar.y}
                    width={bar.width}
                    height={bar.height}
                    fill={seriesColor(bar)}
                    fillOpacity={BAR_FILL_OPACITY}
                  />
                ))}
                {layout.lines.map((line) => (
                  <path
                    key={line.key}
                    d={line.path}
                    fill="none"
                    stroke={seriesColor(line)}
                    strokeWidth={line.dashed ? DASHED_LINE_STROKE_WIDTH : LINE_STROKE_WIDTH}
                    {...(line.dashed ? { strokeDasharray: '5 4', strokeOpacity: 0.9 } : {})}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
              {layout.referenceLines.map((line) => (
                <line
                  key={`ref-casing-${line.index}`}
                  x1={line.x}
                  x2={line.x}
                  y1={0}
                  y2={COMPOSED_CHART_HEIGHT}
                  stroke="hsl(var(--background))"
                  strokeWidth={3.5}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {layout.referenceLines.map((line) => (
                <line
                  key={`ref-${line.index}`}
                  x1={line.x}
                  x2={line.x}
                  y1={0}
                  y2={COMPOSED_CHART_HEIGHT}
                  stroke={seriesColor(line)}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  strokeOpacity={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            {layout.referenceLines.map((line) =>
              line.label === undefined ? null : (
                <span
                  key={`ref-label-${line.index}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 rounded-sm bg-background/80 px-1 whitespace-nowrap font-mono text-[11px] uppercase tracking-widest"
                  style={{
                    left: `${line.xRatio * 100}%`,
                    transform:
                      line.xRatio > 0.85
                        ? 'translateX(-100%)'
                        : line.xRatio < 0.15
                          ? 'none'
                          : 'translateX(-50%)',
                    color: CHART_TONE_COLOR[line.tone],
                  }}
                >
                  {line.label}
                </span>
              ),
            )}

            {children?.(layout)}
          </div>
        </div>

        {rightLabels.length > 0 && (
          <ChartAxisGutter
            side="right"
            labels={rightLabels}
            height={height}
            viewBoxHeight={COMPOSED_CHART_HEIGHT}
          />
        )}
      </div>

      {showLabels && layout.columns.length > 0 && xLabels.length > 0 && (
        <ChartXLabelRow
          leftGutter={leftLabels.length > 0}
          rightGutter={rightLabels.length > 0}
          labels={xLabels.map(({ index, text }) => ({
            xRatio: layout.columns[index].xRatio,
            text,
          }))}
        />
      )}
    </div>
  );
}
