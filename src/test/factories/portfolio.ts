import type { FieldValue } from 'firebase/firestore';

import { auditFields, splitYearMonth } from './audit';

export interface PortfolioDoc {
  id: string;
  name: string;
  securitiesAccountId: string;
  bankAccountId: string;
  isActive: boolean;
  order: number;
  createdAt: FieldValue;
  updatedAt: FieldValue;
  createdBy: string;
  updatedBy: string;
}

export interface PortfolioPerformance {
  openingValue: number;
  closingValue: number;
  netCashFlow: number;
  gain: number;
  returnRate: number;
  cumulativeGain: number;
  cumulativeReturnRate: number;
}

export interface PortfolioSnapshotDoc {
  id: string;
  year: number;
  month: number;
  totalValue: number;
  accounts: unknown[];
  performance: PortfolioPerformance;
  cashFlow: { deposits: number; withdrawals: number };
  createdAt: FieldValue;
  updatedAt: FieldValue;
  createdBy: string;
  updatedBy: string;
}

export const buildPortfolio = (
  id: string,
  overrides: Partial<PortfolioDoc> = {},
): PortfolioDoc => ({
  id,
  name: `Portfolio ${id}`,
  securitiesAccountId: 'acc-1',
  bankAccountId: 'acc-2',
  isActive: true,
  order: 0,
  ...auditFields(),
  ...overrides,
});

export const buildPortfolioSnapshot = (
  yearMonth: string,
  overrides: Partial<PortfolioSnapshotDoc> = {},
): PortfolioSnapshotDoc => ({
  id: yearMonth,
  ...splitYearMonth(yearMonth),
  totalValue: 1000,
  accounts: [],
  performance: {
    openingValue: 0,
    closingValue: 1000,
    netCashFlow: 0,
    gain: 0,
    returnRate: 0,
    cumulativeGain: 0,
    cumulativeReturnRate: 0,
  },
  cashFlow: { deposits: 0, withdrawals: 0 },
  ...auditFields(),
  ...overrides,
});
