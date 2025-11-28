import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { toDateString, toDate, toISOString, fromDate } from './dateUtils';

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
});
