import { AccountCategory } from '@/domains/account/types/categories';
import { createAccountSnapshot, createPortfolioSnapshot } from '@/test/factory';

import { type PortfolioCalculatorInput } from '../portfolioCalculator';

const portfolioId = 'portfolio-1';
const account1Id = 'account-1';
const account2Id = 'account-2';

const account1 = {
  id: account1Id,
  name: 'Stock Account',
  category: AccountCategory.INVESTMENT,
  currency: 'TWD',
  isActive: true,
  householdId: 'h1',
  createdBy: 'u1',
  createdAt: new Date(),
  updatedBy: 'u1',
  updatedAt: new Date(),
};

const account2 = {
  id: account2Id,
  name: 'Bank Account',
  category: AccountCategory.CASH,
  currency: 'TWD',
  isActive: true,
  householdId: 'h1',
  createdBy: 'u1',
  createdAt: new Date(),
  updatedBy: 'u1',
  updatedAt: new Date(),
};

// 1. Initial Snapshot (First month)
export const initialSnapshotData: PortfolioCalculatorInput = {
  year: 2024,
  month: 1,
  portfolioId,
  accounts: [account1, account2],
  accountSnapshots: new Map([
    [account1Id, createAccountSnapshot({ id: account1Id, amount: 100000, year: 2024, month: 1 })],
    [account2Id, createAccountSnapshot({ id: account2Id, amount: 50000, year: 2024, month: 1 })],
  ]),
  prevSnapshot: null,
  cashFlow: { deposits: 0, withdrawals: 0 },
};

// 2. Regular Update (Second month)
const prevSnapshot = createPortfolioSnapshot({
  id: portfolioId,
  year: 2024,
  month: 1,
  totalValue: 150000,
  performance: {
    openingValue: 0,
    closingValue: 150000,
    netCashFlow: 0,
    gain: 150000,
    returnRate: 0,
    cumulativeGain: 150000,
    cumulativeReturnRate: 0,
  },
});

export const regularUpdateData: PortfolioCalculatorInput = {
  year: 2024,
  month: 2,
  portfolioId,
  accounts: [account1, account2],
  accountSnapshots: new Map([
    [account1Id, createAccountSnapshot({ id: account1Id, amount: 110000, year: 2024, month: 2 })],
    [account2Id, createAccountSnapshot({ id: account2Id, amount: 55000, year: 2024, month: 2 })],
  ]),
  prevSnapshot,
  cashFlow: { deposits: 0, withdrawals: 0 },
};

// 3. Cash Flow Impact
export const cashFlowImpactData: PortfolioCalculatorInput = {
  year: 2024,
  month: 2,
  portfolioId,
  accounts: [account1, account2],
  accountSnapshots: new Map([
    [account1Id, createAccountSnapshot({ id: account1Id, amount: 110000, year: 2024, month: 2 })],
    [account2Id, createAccountSnapshot({ id: account2Id, amount: 55000, year: 2024, month: 2 })],
  ]),
  prevSnapshot,
  cashFlow: { deposits: 10000, withdrawals: 2000 },
};

// 4. Missing Account Snapshot
export const missingAccountSnapshotData: PortfolioCalculatorInput = {
  year: 2024,
  month: 1,
  portfolioId,
  accounts: [account1, account2],
  accountSnapshots: new Map([
    [account1Id, createAccountSnapshot({ id: account1Id, amount: 100000, year: 2024, month: 1 })],
    [account2Id, null], // Missing snapshot for account2
  ]),
  prevSnapshot: null,
  cashFlow: { deposits: 0, withdrawals: 0 },
};
