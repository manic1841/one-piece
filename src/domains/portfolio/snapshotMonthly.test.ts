import { describe, expect, it } from 'vitest';

import { monthCode } from '@/domains/report/analysisScale';

import { aggregateSnapshots, completeMonthsOf, monthOf } from './snapshotMonthly';
import { type PortfolioSnapshot } from './types/portfolio';

const snapshot = (
  year: number,
  month: number,
  performance: { gain: number; openingValue: number } | null = null,
  holdings: { marketValue: number; leverage?: number }[] = [],
): PortfolioSnapshot =>
  ({
    year,
    month,
    accounts: [
      {
        accountId: 'a1',
        accountName: 'Securities',
        category: 'securities',
        value: 0,
        holdings: holdings.map((holding) => ({ accountId: 'a1', label: 'ETF', ...holding })),
      },
    ],
    performance: performance ?? undefined,
  }) as unknown as PortfolioSnapshot;

describe('monthOf', () => {
  it('maps a snapshot to its month ordinal', () => {
    expect(monthOf(snapshot(2026, 3))).toBe(monthCode('2026-03'));
    expect(monthOf(snapshot(2026, 12))).toBe(monthCode('2026-12'));
  });
});

describe('aggregateSnapshots', () => {
  it('sums gain and exposure per month across portfolios, weighting by leverage', () => {
    const totals = aggregateSnapshots([
      snapshot(2026, 3, { gain: 100, openingValue: 1000 }, [{ marketValue: 500 }]),
      snapshot(2026, 3, { gain: 20, openingValue: 200 }, [{ marketValue: 100, leverage: 2 }]),
      snapshot(2026, 4, { gain: 5, openingValue: 50 }),
    ]);

    expect(totals.get(monthCode('2026-03'))).toEqual({
      gain: 120,
      openingValue: 1200,
      exposure: 700,
      marketValue: 600,
    });
    expect(totals.get(monthCode('2026-04'))?.gain).toBe(5);
  });

  it('treats a missing performance block as zero', () => {
    expect(aggregateSnapshots([snapshot(2026, 3)]).get(monthCode('2026-03'))).toEqual({
      gain: 0,
      openingValue: 0,
      exposure: 0,
      marketValue: 0,
    });
  });

  it('returns an empty map without snapshots', () => {
    expect(aggregateSnapshots([]).size).toBe(0);
  });
});

describe('completeMonthsOf', () => {
  it('keeps only months every portfolio with history shares', () => {
    const complete = completeMonthsOf([
      ['2026-01', '2026-02', '2026-03'].map(monthCode),
      ['2026-02', '2026-03'].map(monthCode),
    ]);

    expect([...complete]).toEqual(['2026-02', '2026-03'].map(monthCode));
  });

  it('ignores portfolios with no history so a new one cannot blank the series', () => {
    expect([...completeMonthsOf([[monthCode('2026-01')], []])]).toEqual([monthCode('2026-01')]);
  });

  it('is empty when every portfolio is new', () => {
    expect(completeMonthsOf([[], []]).size).toBe(0);
    expect(completeMonthsOf([]).size).toBe(0);
  });
});
