const YEAR_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** The `YYYY-MM` route param, or null when the shape is invalid. */
export const parseYearMonthParam = (raw: string | undefined): string | null =>
  raw && YEAR_MONTH_PATTERN.test(raw) ? raw : null;
