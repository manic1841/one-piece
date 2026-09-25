import { type Account, type AccountSnapshot } from '@/domains/account/types/account';
import { type PortfolioSnapshotCreate } from '@/domains/portfolio/types/portfolio';

interface CalculatePortfolioSnapshotParams {
  year: number;
  month: number;
  portfolioId: string;
  accounts: Account[];
  accountSnapshots: Map<string, AccountSnapshot | null>;
  prevSnapshot: PortfolioSnapshotCreate | null;
  cashFlow: { deposits: number; withdrawals: number };
}

export function calculatePortfolioSnapshot(
  params: CalculatePortfolioSnapshotParams,
): PortfolioSnapshotCreate {
  const { year, month, accounts, accountSnapshots, prevSnapshot, cashFlow } = params;

  // 1. Map individual account snapshots
  const mappedAccounts = accounts.map((account) => {
    const snapshot = accountSnapshots.get(account.id);
    return {
      accountId: account.id,
      accountName: account.name,
      category: account.category,
      value: snapshot?.amount || 0,
      holdings: snapshot?.holdings || [],
    };
  });

  // 2. Calculate current total value
  const totalValue = mappedAccounts.reduce((sum, acc) => sum + acc.value, 0);

  // 3. Calculate performance metrics via the shared single-period derivation
  const openingValue = prevSnapshot?.totalValue || 0;
  const closingValue = totalValue;
  const { netCashFlow, gain, returnRate } = calculatePortfolioPeriodPerformance({
    openingValue,
    closingValue,
    deposits: cashFlow.deposits,
    withdrawals: cashFlow.withdrawals,
  });

  // Cumulative metrics
  let cumulativeGain = gain;
  let cumulativeReturnRate = returnRate;

  if (prevSnapshot) {
    cumulativeGain += prevSnapshot.performance.cumulativeGain;
    // Simple compounding formula for cumulative return
    const prevCumulativeReturn = prevSnapshot.performance.cumulativeReturnRate / 100;
    const currentReturn = returnRate / 100;
    cumulativeReturnRate = ((1 + prevCumulativeReturn) * (1 + currentReturn) - 1) * 100;
  }

  return {
    year,
    month,
    accounts: mappedAccounts,
    totalValue,
    cashFlow,
    performance: {
      openingValue,
      closingValue,
      netCashFlow,
      gain,
      returnRate,
      cumulativeGain,
      cumulativeReturnRate,
    },
  };
}

export interface PortfolioTotalPerformance {
  gain: number;
  returnRate: number;
}

export interface PortfolioPeriodPerformance {
  netCashFlow: number;
  gain: number;
  returnRate: number;
}

/**
 * Single-period derivation shared by the snapshot write path and the close UI:
 * gain nets out cash flow in/out, return rate uses the modified-dietz base.
 */
export function calculatePortfolioPeriodPerformance(params: {
  openingValue: number;
  closingValue: number;
  deposits: number;
  withdrawals: number;
}): PortfolioPeriodPerformance {
  const netCashFlow = params.deposits - params.withdrawals;
  const gain = params.closingValue - params.openingValue - netCashFlow;
  const adjustedBase = params.openingValue + netCashFlow / 2;
  return {
    netCashFlow,
    gain,
    returnRate: adjustedBase > 0 ? (gain / adjustedBase) * 100 : 0,
  };
}

// Total applies the single-period modified-dietz path to the aggregate layer:
// the whole household is treated as one virtual portfolio.
export function calculatePortfolioTotal(
  snapshots: Pick<PortfolioSnapshotCreate, 'performance'>[],
): PortfolioTotalPerformance {
  let totalGain = 0;
  let totalBase = 0;
  for (const snapshot of snapshots) {
    totalGain += snapshot.performance.gain;
    totalBase += snapshot.performance.openingValue + snapshot.performance.netCashFlow / 2;
  }
  return {
    gain: totalGain,
    returnRate: totalBase > 0 ? (totalGain / totalBase) * 100 : 0,
  };
}
