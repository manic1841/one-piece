import { describe, expect, it } from 'vitest';

import { cashCoverageOf } from './analysisCoverage';
import { monthCode } from './analysisScale';

describe('cashCoverageOf', () => {
  it('divides cash by the average of the month and the two before it', () => {
    const expenses = new Map([
      [monthCode('2026-12'), 3000],
      [monthCode('2026-11'), 6000],
      [monthCode('2026-10'), 0],
      [monthCode('2026-09'), 999999],
    ]);

    expect(cashCoverageOf(9000, '2026-12', expenses)).toEqual({
      expenseAverage: 3000,
      coverageMonths: 3,
    });
  });

  it('reaches back across the year boundary', () => {
    const expenses = new Map([
      [monthCode('2026-01'), 3000],
      [monthCode('2025-12'), 3000],
      [monthCode('2025-11'), 3000],
    ]);

    expect(cashCoverageOf(6000, '2026-01', expenses).coverageMonths).toBe(2);
  });

  it('gives up on the window when any of the three months is missing', () => {
    const expenses = new Map([
      [monthCode('2026-12'), 3000],
      [monthCode('2026-11'), 6000],
    ]);

    expect(cashCoverageOf(9000, '2026-12', expenses)).toEqual({
      expenseAverage: null,
      coverageMonths: null,
    });
  });

  it('keeps the average but drops the months when the average is not positive', () => {
    const expenses = new Map([
      [monthCode('2026-12'), 0],
      [monthCode('2026-11'), 0],
      [monthCode('2026-10'), 0],
    ]);

    expect(cashCoverageOf(9000, '2026-12', expenses)).toEqual({
      expenseAverage: 0,
      coverageMonths: null,
    });
  });

  it('keeps a negative average but gives no months', () => {
    const expenses = new Map([
      [monthCode('2026-12'), -3000],
      [monthCode('2026-11'), -3000],
      [monthCode('2026-10'), -3000],
    ]);

    expect(cashCoverageOf(9000, '2026-12', expenses)).toEqual({
      expenseAverage: -3000,
      coverageMonths: null,
    });
  });
});
