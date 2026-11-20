/** Inclusive year-month window, both bounds in `YYYY-MM`. */
export interface MonthWindow {
  from: string;
  to: string;
}

/** Months added to the window by one "load more" action. */
export const LOAD_MORE_STEP_MONTHS = 12;

export const toYearMonth = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const shiftYearMonth = (yearMonth: string, deltaMonths: number): string => {
  const [year, month] = yearMonth.split('-').map(Number);
  return toYearMonth(new Date(year, month - 1 + deltaMonths, 1));
};

/** Half-open date range covering every day of the window. */
export const windowToDateRange = (window: MonthWindow): { start: Date; endExclusive: Date } => {
  const [startYear, startMonth] = window.from.split('-').map(Number);
  const [endYear, endMonth] = window.to.split('-').map(Number);
  return {
    start: new Date(startYear, startMonth - 1, 1),
    endExclusive: new Date(endYear, endMonth, 1),
  };
};

/**
 * Window ending at `end`, spanning `months` calendar months.
 *
 * The caller owns `end`: it starts at today and moves to the newest data month
 * when the data runs ahead, so future-dated records never fall outside the
 * window. Anchoring is done after the load, because the newest month is unknown
 * before querying.
 */
export const buildMonthWindow = (end: string, months: number): MonthWindow => ({
  from: shiftYearMonth(end, -(months - 1)),
  to: end,
});
