import { Timestamp } from 'firebase/firestore';

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
