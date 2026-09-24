import { describe, expect, it } from 'vitest';

import { formatCurrency } from './number';

describe('formatCurrency', () => {
  it('defaults to the base currency (TWD)', () => {
    expect(formatCurrency(1100)).toBe('NT$1,100');
  });

  it('puts the sign before the symbol without decimals', () => {
    expect(formatCurrency(-12300)).toBe('-NT$12,300');
    expect(formatCurrency(0)).toBe('NT$0');
  });

  it('uses US$ for USD so it cannot be confused with TWD', () => {
    expect(formatCurrency(12000, 'USD')).toBe('US$12,000');
  });

  it('formats the remaining foreign currencies symbol-first', () => {
    expect(formatCurrency(375, 'EUR')).toBe('€375');
    expect(formatCurrency(12812500, 'JPY')).toBe('¥12,812,500');
  });

  it('falls back to a code suffix for an unrecognised code', () => {
    expect(formatCurrency(1234, 'GBP')).toBe('1,234 GBP');
  });
});
