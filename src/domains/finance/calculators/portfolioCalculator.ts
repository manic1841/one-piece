import { serverTimestamp, Timestamp } from 'firebase/firestore';
import {
  type PortfolioSnapshot,
  type PortfolioAccountSnapshot,
  type AccountSnapshot,
  type Account,
} from '../../../schemas';

export interface PortfolioCalculatorInput {
  year: number;
  month: number;
  portfolioId: string;
  accounts: Account[];
  accountSnapshots: Map<string, AccountSnapshot | null>; // Map accountId to snapshot (or null if missing)
  prevSnapshot: PortfolioSnapshot | null;
  cashFlow: { deposits: number; withdrawals: number };
  createdBy: string;
}

/**
 * Pure function to calculate a portfolio snapshot.
 */
export function calculatePortfolioSnapshot(
  input: PortfolioCalculatorInput
): Omit<PortfolioSnapshot, 'id'> {
  const {
    year,
    month,
    accounts,
    accountSnapshots,
    prevSnapshot,
    cashFlow,
    createdBy,
  } = input;

  // 1. Process Account Snapshots
  const portfolioAccountSnapshots: PortfolioAccountSnapshot[] = [];
  let totalValue = 0;

  for (const account of accounts) {
    const snapshot = accountSnapshots.get(account.id);

    if (snapshot) {
      const accountSnapshot: PortfolioAccountSnapshot = {
        accountId: account.id,
        accountName: account.name,
        type: account.type,
        value: snapshot.amount,
      };

      // Only include holdings if they exist
      if (snapshot.holdings && snapshot.holdings.length > 0) {
        accountSnapshot.holdings = snapshot.holdings;
      }

      portfolioAccountSnapshots.push(accountSnapshot);
      totalValue += snapshot.amount;
    } else {
      // If no snapshot for this month, include with 0 value
      portfolioAccountSnapshots.push({
        accountId: account.id,
        accountName: account.name,
        type: account.type,
        value: 0,
      });
    }
  }

  // 2. Calculate Performance
  const openingValue = prevSnapshot ? prevSnapshot.performance.closingValue : 0;
  const closingValue = totalValue;
  const netCashFlow = cashFlow.deposits - cashFlow.withdrawals;

  // Gain = Closing - Opening - NetFlow
  const gain = closingValue - openingValue - netCashFlow;

  // Return Rate
  // Formula: gain / (openingValue + deposits) * 100
  let returnRate = 0;
  const denominator = openingValue + cashFlow.deposits;
  if (denominator > 0) {
    returnRate = (gain / denominator) * 100;
  }

  // Cumulative Gain
  const prevCumulativeGain = prevSnapshot ? prevSnapshot.performance.cumulativeGain : 0;
  const cumulativeGain = prevCumulativeGain + gain;

  // Cumulative Return Rate
  // Formula: (cumulativeGain / totalInvested) * 100
  // totalInvested = currentTotalValue - cumulativeGain
  const totalInvested = closingValue - cumulativeGain;

  let cumulativeReturnRate = 0;
  if (totalInvested > 0) {
    cumulativeReturnRate = (cumulativeGain / totalInvested) * 100;
  }

  const performance = {
    openingValue,
    closingValue,
    netCashFlow,
    gain,
    returnRate,
    cumulativeGain,
    cumulativeReturnRate,
  };

  return {
    year,
    month,
    accounts: portfolioAccountSnapshots,
    totalValue,
    cashFlow,
    performance,
    createdBy,
    createdAt: serverTimestamp() as unknown as Timestamp,
  };
}
