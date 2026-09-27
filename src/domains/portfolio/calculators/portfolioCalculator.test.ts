import { describe, expect, it } from 'vitest';

import { type PortfolioSnapshotCreate } from '../types/portfolio';
import { calculatePortfolioSnapshot, calculatePortfolioTotal } from './portfolioCalculator';

const snapshotOf = (overrides: Partial<PortfolioSnapshotCreate>): PortfolioSnapshotCreate => ({
  year: 2026,
  month: 9,
  accounts: [],
  totalValue: 0,
  cashFlow: { deposits: 0, withdrawals: 0 },
  performance: {
    openingValue: 0,
    closingValue: 0,
    netCashFlow: 0,
    gain: 0,
    returnRate: 0,
    cumulativeGain: 0,
    cumulativeReturnRate: 0,
  },
  ...overrides,
});

describe('calculatePortfolioTotal', () => {
  it('aggregates gains and weighted bases as one virtual portfolio', () => {
    const total = calculatePortfolioTotal([
      snapshotOf({
        performance: {
          openingValue: 1_000_000,
          closingValue: 1_035_000,
          netCashFlow: 70_000,
          gain: 35_000,
          returnRate: 3.381642512077295,
          cumulativeGain: 35_000,
          cumulativeReturnRate: 3.381642512077295,
        },
      }),
      snapshotOf({
        performance: {
          openingValue: 500_000,
          closingValue: 510_000,
          netCashFlow: 0,
          gain: 10_000,
          returnRate: 2,
          cumulativeGain: 10_000,
          cumulativeReturnRate: 2,
        },
      }),
    ]);

    expect(total.gain).toBe(45_000);
    expect(total.returnRate).toBeCloseTo((45_000 / 1_535_000) * 100, 10);
  });

  it('returns zero for an empty portfolio list', () => {
    const total = calculatePortfolioTotal([]);

    expect(total.gain).toBe(0);
    expect(total.returnRate).toBe(0);
  });

  it('does not divide by zero when every weighted base is non-positive', () => {
    const total = calculatePortfolioTotal([
      snapshotOf({
        performance: {
          openingValue: 0,
          closingValue: 5_000,
          netCashFlow: -2_000,
          gain: 1_000,
          returnRate: 0,
          cumulativeGain: 1_000,
          cumulativeReturnRate: 0,
        },
      }),
    ]);

    expect(total.gain).toBe(1_000);
    expect(total.returnRate).toBe(0);
  });
});

describe('calculatePortfolioSnapshot regression', () => {
  it('keeps modified-dietz math unchanged', () => {
    const snapshot = calculatePortfolioSnapshot({
      year: 2026,
      month: 9,
      portfolioId: 'p1',
      accounts: [],
      accountSnapshots: new Map(),
      prevSnapshot: null,
      cashFlow: { deposits: 100_000, withdrawals: 30_000 },
    });

    // gain = 0 - 0 - 70000 = -70000; denominator = 0 + 70000/2 = 35000
    // returnRate = -70000 / 35000 * 100 = -200
    expect(snapshot.totalValue).toBe(0);
    expect(snapshot.performance.netCashFlow).toBe(70_000);
    expect(snapshot.performance.gain).toBe(-70_000);
    expect(snapshot.performance.returnRate).toBe(-200);
  });
});
