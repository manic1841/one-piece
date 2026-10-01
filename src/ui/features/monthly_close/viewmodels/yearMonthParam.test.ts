import { describe, expect, it } from 'vitest';

import { parseYearMonthParam } from './yearMonthParam';

describe('parseYearMonthParam', () => {
  it('accepts a well-formed year-month param', () => {
    expect(parseYearMonthParam('2026-09')).toBe('2026-09');
    expect(parseYearMonthParam('2025-01')).toBe('2025-01');
    expect(parseYearMonthParam('2026-12')).toBe('2026-12');
  });

  it('rejects a missing param', () => {
    expect(parseYearMonthParam(undefined)).toBeNull();
    expect(parseYearMonthParam('')).toBeNull();
  });

  it('rejects a malformed shape', () => {
    expect(parseYearMonthParam('abc')).toBeNull();
    expect(parseYearMonthParam('2026-13')).toBeNull();
    expect(parseYearMonthParam('2026-00')).toBeNull();
    expect(parseYearMonthParam('2026-9')).toBeNull();
    expect(parseYearMonthParam('26-09')).toBeNull();
    expect(parseYearMonthParam('2026-09-01')).toBeNull();
    expect(parseYearMonthParam('2026-09 ')).toBeNull();
  });
});
