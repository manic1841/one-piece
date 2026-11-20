import { describe, expect, it } from 'vitest';

import { buildMonthWindow, shiftYearMonth, windowToDateRange } from './monthWindow';

describe('monthWindow', () => {
  it('shifts across year boundaries in both directions', () => {
    expect(shiftYearMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftYearMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftYearMonth('2026-11', -2)).toBe('2026-09');
  });

  it('spans the requested months ending at the anchor', () => {
    expect(buildMonthWindow('2026-11', 12)).toEqual({ from: '2025-12', to: '2026-11' });
  });

  it('spans a single month when asked for one', () => {
    expect(buildMonthWindow('2026-11', 1)).toEqual({ from: '2026-11', to: '2026-11' });
  });

  it('covers whole months as a half-open date range', () => {
    const range = windowToDateRange({ from: '2026-01', to: '2026-02' });
    expect(range.start).toEqual(new Date(2026, 0, 1));
    expect(range.endExclusive).toEqual(new Date(2026, 2, 1));
  });
});
