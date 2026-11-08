import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { CHART_COLOR_TOKEN_COLOR, CHART_TONE_COLOR } from './chartTheme';
import {
  COMPOSED_CHART_HEIGHT,
  COMPOSED_CHART_WIDTH,
  type ComposedChartLayout,
  type ComposedReferenceLine,
  type ComposedSeries,
  MAX_X_LABELS,
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
const DASHED_LINE_STROKE_WIDTH = 1.2;
/** Narrowest slot an x label may occupy before the next one is dropped. */
const MIN_X_LABEL_SLOT = 64;

const MONTH_LABEL = /^([A-Z]{3}) (\d{4})$/;

/** Drop the repeated year so neighbouring labels fit; the first label keeps it. */
const shortenXLabels = (
  labels: string[],
  indices: number[],
): { index: number; position: number; text: string }[] => {
  let previousYear: string | null = null;
  return indices.map((index, position) => {
    const raw = labels[index];
    const match = MONTH_LABEL.exec(raw);
    if (match === null) return { index, position, text: raw };
    const text = match[2] === previousYear ? match[1] : raw;
    previousYear = match[2];
    return { index, position, text };
  });
};

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
  // A padded scale can leave the zero baseline between gridlines; label it so a
  // negative bar is not read against the nearest (non-zero) tick. The tick it
  // replaces is dropped to keep the two 11px labels from colliding.
  const zeroLabelY = layout.zeroY;
  const leftLabels =
    zeroLabelY !== undefined &&
    !layout.leftLabels.some((label) => Math.abs(label.y - zeroLabelY) < 10)
      ? [
          ...layout.leftLabels.filter((label) => Math.abs(label.y - zeroLabelY) >= 20),
          { y: zeroLabelY, text: '0' },
        ]
      : layout.leftLabels;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState<number | null>(null);
  React.useEffect(() => {
    const element = containerRef.current;
    if (element === null) return;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();
    window.addEventListener('resize', measure);
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure());
    observer?.observe(element);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, []);
  const xLabels = shortenXLabels(
    labels,
    pickComposedXLabels(
      labels.length,
      width === null ? MAX_X_LABELS : Math.min(MAX_X_LABELS, Math.floor(width / MIN_X_LABEL_SLOT)),
    ),
  );
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
    <div ref={containerRef} className={cn('relative', className)}>
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

        {leftLabels.length > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {leftLabels.map((label, index) => (
              <span
                key={`left-${index}`}
                className="absolute left-0 -translate-y-1/2 font-mono text-[11px] tabular-nums text-muted-foreground"
                style={{ top: `${(label.y / COMPOSED_CHART_HEIGHT) * 100}%` }}
              >
                {label.text}
                {yUnit ?? ''}
              </span>
            ))}
          </div>
        )}
        {layout.rightLabels.length > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {layout.rightLabels.map((label, index) => (
              <span
                key={`right-${index}`}
                className="absolute right-0 -translate-y-1/2 font-mono text-[11px] tabular-nums text-muted-foreground"
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

      {/* With every series hidden the geometry returns an empty layout, so there are no columns to anchor labels to. */}
      {showLabels && layout.columns.length > 0 && (
        <div className="relative mt-2 h-4">
          {xLabels.map(({ index, position, text }) => (
            <span
              key={`${labels[index]}-${index}`}
              className="absolute whitespace-nowrap font-mono text-[11px] tabular-nums text-muted-foreground"
              style={{
                left: `${layout.columns[index].xRatio * 100}%`,
                transform:
                  position === 0
                    ? 'none'
                    : position === xLabels.length - 1
                      ? 'translateX(-100%)'
                      : 'translateX(-50%)',
              }}
            >
              {text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
