import type { Portfolio, PortfolioSnapshot } from '@/schemas/portfolio';

// Factory: Portfolio
export function createPortfolio(overrides?: Partial<Portfolio>): Portfolio {
  return {
    id: 'portfolio-test-1',
    name: 'Test Portfolio',
    description: 'Test Description',
    accountIds: ['account-test-1'],
    isActive: true,
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedBy: 'test-user',
    updatedAt: new Date(),
    ...overrides,
  };
}

// Factory: PortfolioSnapshot
export function createPortfolioSnapshot(overrides?: Partial<PortfolioSnapshot>): PortfolioSnapshot {
  return {
    id: 'ps-test-1',
    year: 2024,
    month: 1,
    accounts: [
      {
        accountId: 'account-test-1',
        accountName: 'Test Account',
        category: 'cash',
        value: 10000,
      },
    ],
    totalValue: 10000,
    cashFlow: {
      deposits: 0,
      withdrawals: 0,
    },
    performance: {
      openingValue: 0,
      closingValue: 10000,
      netCashFlow: 0,
      gain: 10000,
      returnRate: 0,
      cumulativeGain: 10000,
      cumulativeReturnRate: 0,
    },
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedBy: 'test-user',
    updatedAt: new Date(),
    ...overrides,
  };
}
