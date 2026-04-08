import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  toDateString,
  toDate,
  toISOString,
  fromDate,
  getMonthRange,
  formatDateRange,
} from './dateUtils';

describe('dateUtils', () => {
  const testDate = new Date('2023-10-05T12:00:00.000Z');
  const testTimestamp = Timestamp.fromDate(testDate);

  describe('toDateString', () => {
    it('should convert Date object to YYYY-MM-DD string', () => {
      // Note: This depends on local timezone if toISOString().split('T')[0] uses UTC
      // The implementation uses toISOString() which is UTC.
      expect(toDateString(testDate)).toBe('2023-10-05');
    });

    it('should convert Timestamp to YYYY-MM-DD string', () => {
      expect(toDateString(testTimestamp)).toBe('2023-10-05');
    });
  });

  describe('toDate', () => {
    it('should return Date object as is', () => {
      const result = toDate(testDate);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(testDate.getTime());
    });

    it('should convert Timestamp to Date object', () => {
      const result = toDate(testTimestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(testDate.getTime());
    });
  });

  describe('toISOString', () => {
    it('should convert Date to ISO string', () => {
      expect(toISOString(testDate)).toBe(testDate.toISOString());
    });

    it('should convert Timestamp to ISO string', () => {
      expect(toISOString(testTimestamp)).toBe(testDate.toISOString());
    });
  });

  describe('fromDate', () => {
    it('should convert Date to Timestamp', () => {
      const result = fromDate(testDate);
      expect(result).toBeInstanceOf(Timestamp);
      expect(result.toMillis()).toBe(testDate.getTime());
    });
  });

  describe('getMonthRange', () => {
    it('should return correct start and end for January', () => {
      const { start, end } = getMonthRange(2025, 1);
      
      expect(start.getFullYear()).toBe(2025);
      expect(start.getMonth()).toBe(0);
      expect(start.getDate()).toBe(1);
      
      expect(end.getFullYear()).toBe(2025);
      expect(end.getMonth()).toBe(0);
      expect(end.getDate()).toBe(31);
    });

    it('should return correct start and end for February (leap year)', () => {
      const { start, end } = getMonthRange(2024, 2);
      
      expect(start.getDate()).toBe(1);
      expect(end.getDate()).toBe(29);
    });
  });

  describe('formatDateRange', () => {
    it('should format date range correctly', () => {
      const start = new Date(2025, 0, 1);
      const end = new Date(2025, 0, 31);
      
      const formatted = formatDateRange(start, end);
      
      expect(formatted).toBe('2025/01/01 - 2025/01/31');
    });
  });
});
