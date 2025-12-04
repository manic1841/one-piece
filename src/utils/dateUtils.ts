import { Timestamp } from 'firebase/firestore';

// Convert Firestore Timestamp to JavaScript Date object
export const convertToDate = (value: Timestamp): Date => {
  // 檢查是否包含 toDate 函式 (Firestore Timestamp 的特徵)
  if (value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  throw new Error('Invalid Timestamp');
};

/**
 * Convert Firestore Timestamp or Date to date string (YYYY-MM-DD format)
 * @param date - Firestore Timestamp or Date object
 * @returns Date string in YYYY-MM-DD format
 */
export const toDateString = (date: Timestamp | Date): string => {
  if (date instanceof Timestamp) {
    return date.toDate().toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
};

/**
 * Convert Firestore Timestamp or Date to JavaScript Date object
 * @param date - Firestore Timestamp or Date object
 * @returns JavaScript Date object
 */
export const toDate = (date: Timestamp | Date): Date => {
  if (date instanceof Timestamp) {
    return date.toDate();
  }
  return date;
};

/**
 * Convert Firestore Timestamp or Date to ISO string
 * @param date - Firestore Timestamp or Date object
 * @returns ISO 8601 date-time string
 */
export const toISOString = (date: Timestamp | Date): string => {
  if (date instanceof Timestamp) {
    return date.toDate().toISOString();
  }
  return date.toISOString();
};

/**
 * Convert JavaScript Date to Firestore Timestamp
 * @param date - JavaScript Date object
 * @returns Firestore Timestamp
 */
export const fromDate = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

/**
 * Format year and month as YYYY-MM string
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 * @returns Formatted string (e.g., "2025-01")
 */
export const formatYearMonth = (year: number, month: number): string => {
  return `${year}-${month.toString().padStart(2, '0')}`;
};

/**
 * Get start and end dates for a given month
 * @param year - Year
 * @param month - Month (1-12)
 * @returns Object with start and end dates
 */
export const getMonthRange = (year: number, month: number): { start: Date; end: Date } => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

/**
 * Get start and end dates for a given quarter
 * @param year - Year
 * @param quarter - Quarter (1-4)
 * @returns Object with start and end dates
 */
export const getQuarterRange = (year: number, quarter: number): { start: Date; end: Date } => {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const start = new Date(year, startMonth - 1, 1);
  const end = new Date(year, endMonth, 0, 23, 59, 59, 999);
  return { start, end };
};

/**
 * Get start and end dates for a given year
 * @param year - Year
 * @returns Object with start and end dates
 */
export const getYearRange = (year: number): { start: Date; end: Date } => {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end };
};

/**
 * Format date range as string
 * @param start - Start date
 * @param end - End date
 * @returns Formatted string (e.g., "2025/01/01 - 2025/01/31")
 */
export const formatDateRange = (start: Date, end: Date): string => {
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  return `${formatDate(start)} - ${formatDate(end)}`;
};
