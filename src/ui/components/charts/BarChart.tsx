import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { ChartXLabelRow } from './ChartXLabelRow';
import { CHART_TONE_FILL, type ChartTone } from './chartTheme';
import { useMeasuredWidth } from './useMeasuredWidth';
import { MIN_X_LABEL_SLOT, pickXLabels, shortenXLabels } from './xLabels';

export type BarChartSeries = {
  tone: ChartTone;
  /** One value per column; rendered as a magnitude (height ∝ value). */
  values: number[];
};

export type BarChartColumn = {
  index: number;
  label: string;
  /** Value per series, in the same order as `series`. */
  values: number[];
  /** Tallest bar in this column as a 0–1 fraction of the bar area height. */
  ratio: number;
};

export type BarChartLayout = {
  columns: BarChartColumn[];
  /** Divisor the bar heights were scaled against. */
  scale: number;
};

type BarChartProps = {
  /** One label per column; rendered under the bars. */
  labels: string[];
  /** Grouped series. Each column renders one bar per series, side by side. */
  series: BarChartSeries[];
  /** Column index rendered in the primary tone (the "current" period). */
  highlightIndex?: number;
  /** Rendered bar area height in px. */
  height?: number;
  showLabels?: boolean;
  ariaLabel?: string;
  className?: string;
  /**
   * Overlay renderer (hover targets, tooltip). Rendered inside the padded bar
   * area; mirror the area's flex classes to align with the columns.
   */
  children?: (layout: BarChartLayout) => React.ReactNode;
};

/**
 * Data-driven grouped bar chart. Values are magnitudes: use the series tone to
 * express income / expense rather than negative heights. Quiet by default — the
 * primary tone is reserved for the highlighted column.
 */
export function BarChart({
  labels,
  series,
  highlightIndex,
  height = 165,
  showLabels = true,
  ariaLabel,
  className,
  children,
}: BarChartProps) {
  const [plotRef, plotWidth] = useMeasuredWidth<HTMLDivElement>();
  const max = series.reduce(
    (acc, item) => item.values.reduce((inner, value) => Math.max(inner, Math.abs(value)), acc),
    0,
  );
  const scale = max > 0 ? max : 1;
  const columns: BarChartColumn[] = labels.map((label, index) => {
    const values = series.map((item) => Math.abs(item.values[index] ?? 0));
    return { index, label, values, ratio: (values.length > 0 ? Math.max(...values) : 0) / scale };
  });
  const a11yProps =
    ariaLabel === undefined || children !== undefined
      ? {}
      : { role: 'img' as const, 'aria-label': ariaLabel };

  // Labels are thinned by the plot's own width, like the line chart: a flex row
  // of equal labels cannot shrink below its text and pushes the page sideways on
  // phones. Columns carry `px-0.5` instead of a row `gap-*`, so every column is
  // an exact 1/n slice and a label centre stays on its bars. One label per column
  // is the natural ceiling here, so the generic six-label cap does not apply.
  const slots = plotWidth === null ? labels.length : Math.floor(plotWidth / MIN_X_LABEL_SLOT);
  const axisLabels = showLabels
    ? shortenXLabels(
        labels,
        pickXLabels(labels.length, Math.max(2, Math.min(labels.length, slots))),
      )
    : [];

  return (
    <div className={className}>
      <div
        ref={plotRef}
        className="relative flex items-stretch border-b border-border px-2"
        style={{ height }}
        {...a11yProps}
      >
        {labels.map((label, columnIndex) => (
          <div key={label} className="flex h-full flex-1 items-end justify-center gap-1 px-0.5">
            {series.map((item, seriesIndex) => {
              const value = Math.abs(item.values[columnIndex] ?? 0);
              const tone = columnIndex === highlightIndex ? 'primary' : item.tone;
              return (
                <div
                  key={seriesIndex}
                  // Grows out of the shared baseline on mount (motion-system
                  // §5.7). Values are magnitudes here, so there is one
                  // direction to grow in.
                  className={cn(
                    'min-h-[3px] w-[38%] origin-bottom animate-chart-reveal',
                    CHART_TONE_FILL[tone],
                  )}
                  style={{ height: `${Math.max(2, (value / scale) * 100)}%` }}
                />
              );
            })}
          </div>
        ))}
        {children?.({ columns, scale })}
      </div>
      {axisLabels.length > 0 && (
        <ChartXLabelRow
          testId="bar-chart-x-labels"
          className="px-2"
          leftGutter={false}
          rightGutter={false}
          labels={axisLabels.map((label) => ({
            xRatio: (label.index + 0.5) / labels.length,
            text: label.text,
          }))}
        />
      )}
    </div>
  );
}
