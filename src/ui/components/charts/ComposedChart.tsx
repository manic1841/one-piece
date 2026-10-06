import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { CHART_TONE_COLOR } from './chartTheme';
import {
  COMPOSED_CHART_HEIGHT,
  COMPOSED_CHART_WIDTH,
  type ComposedChartLayout,
  type ComposedReferenceLine,
  type ComposedSeries,
  buildComposedGeometry,
  pickComposedXLabels,
} from './composedChartGeometry';

const BAR_FILL_OPACITY = 0.6;
/**
 * Area fill: a single-colour gradient at full strength where the band meets its own line,
 * fading to nothing at the band's baseline (ADR-0078). Decorative gradients remain banned —
 * this one carries which line an area belongs to.
 */
const AREA_GRADIENT_OPACITY = 0.38;
const LINE_STROKE_WIDTH = 1.8;

type ComposedChartProps = {
  labels: string[];
  series: ComposedSeries[];
  /** Vertical markers (e.g. the retirement year). */
  referenceLines?: ComposedReferenceLine[];
  /** Rendered plot height in px. */
  height?: number;
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
  showLabels = true,
  ariaLabel,
  className,
  children,
}: ComposedChartProps) {
  const layout = buildComposedGeometry(labels, series, referenceLines);
  const xLabelIndices = pickComposedXLabels(labels.length);
  // Gradient ids must be unique per chart instance, or a second chart on the page reuses the first.
  const gradientIdPrefix = React.useId().replace(/:/g, '');
  const a11yProps =
    ariaLabel === undefined || children !== undefined
      ? {}
      : { role: 'img' as const, 'aria-label': ariaLabel };

  return (
    <div className={cn('relative', className)}>
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
                    stopColor={CHART_TONE_COLOR[line.tone]}
                    stopOpacity={AREA_GRADIENT_OPACITY}
                  />
                  <stop offset="100%" stopColor={CHART_TONE_COLOR[line.tone]} stopOpacity={0} />
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
              fill={CHART_TONE_COLOR[bar.tone]}
              fillOpacity={BAR_FILL_OPACITY}
            />
          ))}
          {layout.lines.map((line) => (
            <path
              key={line.key}
              d={line.path}
              fill="none"
              stroke={CHART_TONE_COLOR[line.tone]}
              strokeWidth={LINE_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
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
              stroke={CHART_TONE_COLOR[line.tone]}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              strokeOpacity={0.8}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {layout.leftLabels.length > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {layout.leftLabels.map((label, index) => (
              <span
                key={`left-${index}`}
                className="absolute left-0 -translate-y-1/2 font-mono text-[10px] tabular-nums text-muted-foreground"
                style={{ top: `${(label.y / COMPOSED_CHART_HEIGHT) * 100}%` }}
              >
                {label.text}
              </span>
            ))}
          </div>
        )}
        {layout.rightLabels.length > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {layout.rightLabels.map((label, index) => (
              <span
                key={`right-${index}`}
                className="absolute right-0 -translate-y-1/2 font-mono text-[10px] tabular-nums text-muted-foreground"
                style={{ top: `${(label.y / COMPOSED_CHART_HEIGHT) * 100}%` }}
              >
                {label.text}
              </span>
            ))}
          </div>
        )}
        {layout.referenceLines.map((line) =>
          line.label === undefined ? null : (
            <span
              key={`ref-label-${line.index}`}
              aria-hidden="true"
              className="pointer-events-none absolute top-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest"
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

      {showLabels && xLabelIndices.length > 0 && (
        <div className="relative mt-2 h-4">
          {xLabelIndices.map((index, position) => (
            <span
              key={`${labels[index]}-${index}`}
              className="absolute whitespace-nowrap font-mono text-[10px] tabular-nums text-muted-foreground"
              style={{
                left: `${layout.columns[index].xRatio * 100}%`,
                transform:
                  position === 0
                    ? 'none'
                    : position === xLabelIndices.length - 1
                      ? 'translateX(-100%)'
                      : 'translateX(-50%)',
              }}
            >
              {labels[index]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
