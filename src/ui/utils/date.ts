/**
 * Date formatting utilities
 */

/**
 * Format a date to a string (YYYY-MM-DD)
 * @param date - The date to format
 * @returns Formatted date string (e.g., "2022-01-01")
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
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
