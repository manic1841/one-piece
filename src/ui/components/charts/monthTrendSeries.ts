/**
 * Prep for the month-labelled line charts (account balance, debt balance,
 * portfolio value). Callers hand over their snapshot periods and plotted value
 * in any order; the label, tooltip text and the ascending series the chart
 * expects are derived here, so every month trend in the app reads the same.
 */
import { formatCurrency } from '@/ui/utils';
import { formatMonthLabel } from '@/ui/utils/date';

import type { ChartPoint } from './chartInteraction';

export interface MonthTrendPoint {
  year: number;
  month: number;
  value: number;
}

export interface MonthTrendSeries {
  /** Plotted values, oldest first. */
  values: number[];
  /** Tick labels, oldest first. */
  labels: string[];
  /** One tooltip point per value. */
  points: ChartPoint[];
  /** False when there are no periods; callers render their own empty copy. */
  hasData: boolean;
}

/**
 * @param meta Muted tooltip line for a point (e.g. the change against the
 *   previous period); omit it when the value alone is the whole story.
 */
export const toMonthTrendSeries = (
  points: readonly MonthTrendPoint[],
  meta?: (
    point: MonthTrendPoint,
    index: number,
    ordered: readonly MonthTrendPoint[],
  ) => string | undefined,
): MonthTrendSeries => {
  const ordered = [...points].sort((a, b) => a.year - b.year || a.month - b.month);

  return {
    values: ordered.map((point) => point.value),
    labels: ordered.map((point) => formatMonthLabel(point.year, point.month)),
    points: ordered.map((point, index) => ({
      title: formatMonthLabel(point.year, point.month),
      value: formatCurrency(point.value),
      meta: meta?.(point, index, ordered),
    })),
    hasData: ordered.length > 0,
  };
};
