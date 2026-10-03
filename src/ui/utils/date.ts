import { format } from 'date-fns';

/** Uppercase month abbreviations (JAN…DEC), the axis/period vocabulary for month-labelled series. */
export const MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

/** Month label for a period, e.g. "SEP 2026". */
export const formatMonthLabel = (year: number, month: number): string =>
  `${MONTH_NAMES[month - 1]} ${year}`;

/**
 * Format a date to a string (YYYY-MM-DD)
 * @param date - The date to format
 * @returns Formatted date string (e.g., "2022-01-01")
 */
export const formatDate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Format year and month for display
 * @param year - The year (e.g., 2023)
 * @param month - The month (1-12)
 * @returns Formatted string (e.g., "2023-10")
 */
export const formatYearMonth = (year: number, month: number): string => {
  return `${year}-${month.toString().padStart(2, '0')}`;
};
