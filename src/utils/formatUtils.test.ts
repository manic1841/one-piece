import { describe, expect, it } from 'vitest';

import { formatCompactNumber, formatCurrency, formatPercentage } from './formatUtils';

describe('formatUtils', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers correctly', () => {
      expect(formatCurrency(1234)).toBe('$1,234');
      expect(formatCurrency(1234.56)).toBe('$1,235'); // Rounds to nearest integer
    });

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0');
    });

    it('should format negative numbers correctly', () => {
      expect(formatCurrency(-1234)).toBe('-$1,234');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default decimals', () => {
      expect(formatPercentage(45.5)).toBe('45.5%');
    });

    it('should format percentage with custom decimals', () => {
      expect(formatPercentage(45.567, 2)).toBe('45.57%');
      expect(formatPercentage(45, 0)).toBe('45%');
    });
  });

  describe('formatCompactNumber', () => {
    it('should format small numbers as is', () => {
      expect(formatCompactNumber(123)).toBe('123');
      expect(formatCompactNumber(999)).toBe('999');
    });

    it('should format thousands with K', () => {
      expect(formatCompactNumber(1000)).toBe('1.0K');
      expect(formatCompactNumber(1500)).toBe('1.5K');
      expect(formatCompactNumber(12345)).toBe('12.3K');
    });

    it('should format millions with M', () => {
      expect(formatCompactNumber(1000000)).toBe('1.0M');
      expect(formatCompactNumber(1500000)).toBe('1.5M');
    });

    it('should format billions with B', () => {
      expect(formatCompactNumber(1000000000)).toBe('1.0B');
      expect(formatCompactNumber(1500000000)).toBe('1.5B');
    });
  });
});
