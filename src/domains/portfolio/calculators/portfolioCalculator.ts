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
  params: CalculatePortfolioSnapshotParams
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

  // 3. Calculate performance metrics
  const openingValue = prevSnapshot?.totalValue || 0;
  const closingValue = totalValue;
  
  // Net Cash Flow = Deposits - Withdrawals
  const netCashFlow = cashFlow.deposits - cashFlow.withdrawals;
  
  // Gain = Closing Value - Opening Value - Net Cash Flow
  const gain = closingValue - openingValue - netCashFlow;

  // Return Rate = Gain / (Opening Value + (Net Cash Flow / 2))
  // We use Modified Dietz approximation or simple return
  let returnRate = 0;
  const adjustedBase = openingValue + netCashFlow / 2;
  if (adjustedBase > 0) {
    returnRate = (gain / adjustedBase) * 100;
  }

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
