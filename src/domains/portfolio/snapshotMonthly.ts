import { monthCodeOf } from '@/domains/report/analysisScale';

import { type PortfolioSnapshot } from './types/portfolio';

/** One month's household snapshot totals, summed across every portfolio. */
interface SnapshotMonth {
  gain: number;
  openingValue: number;
  exposure: number;
  marketValue: number;
}

/** The month ordinal a snapshot belongs to. */
export const monthOf = (snapshot: PortfolioSnapshot): number =>
  monthCodeOf(snapshot.year, snapshot.month);

/** Household monthly totals; exposure is market-value weighted by each holding's leverage. */
export const aggregateSnapshots = (
  snapshots: readonly PortfolioSnapshot[],
): Map<number, SnapshotMonth> => {
  const byMonth = new Map<number, SnapshotMonth>();
  for (const snapshot of snapshots) {
    const key = monthOf(snapshot);
    const totals = byMonth.get(key) ?? { gain: 0, openingValue: 0, exposure: 0, marketValue: 0 };
    totals.gain += snapshot.performance?.gain ?? 0;
    totals.openingValue += snapshot.performance?.openingValue ?? 0;
    for (const account of snapshot.accounts) {
      for (const holding of account.holdings ?? []) {
        const marketValue = holding.marketValue ?? 0;
        totals.exposure += marketValue * (holding.leverage ?? 1);
        totals.marketValue += marketValue;
      }
    }
    byMonth.set(key, totals);
  }
  return byMonth;
};

/**
 * Months where every portfolio that has any history also has a snapshot. Portfolios
 * with no snapshots at all (newly created) are ignored so they cannot blank the series.
 */
export const completeMonthsOf = (
  monthsPerPortfolio: readonly (readonly number[])[],
): Set<number> => {
  const monthsPerPortfolioSet = monthsPerPortfolio
    .map((months) => new Set(months))
    .filter((months) => months.size > 0);
  const [first, ...rest] = monthsPerPortfolioSet;
  if (first === undefined) return new Set();
  return rest.reduce(
    (shared, months) => new Set([...shared].filter((month) => months.has(month))),
    first,
  );
};
