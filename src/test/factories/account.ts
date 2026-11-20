import type { FieldValue } from 'firebase/firestore';

import { auditFields, splitYearMonth } from './audit';

export interface AccountDoc {
  id: string;
  name: string;
  category: string;
  currency: string;
  order: number;
  isActive: boolean;
  createdAt: FieldValue;
  updatedAt: FieldValue;
  createdBy: string;
  updatedBy: string;
}

export interface AccountSnapshotDoc {
  id: string;
  accountId: string;
  year: number;
  month: number;
  amount: number;
  holdings: unknown[];
  createdAt: FieldValue;
  updatedAt: FieldValue;
  createdBy: string;
  updatedBy: string;
}

export const buildAccount = (id: string, overrides: Partial<AccountDoc> = {}): AccountDoc => ({
  id,
  name: `Account ${id}`,
  category: 'cash',
  currency: 'TWD',
  order: 0,
  isActive: true,
  ...auditFields(),
  ...overrides,
});

export const buildAccountSnapshot = (
  accountId: string,
  yearMonth: string,
  overrides: Partial<AccountSnapshotDoc> = {},
): AccountSnapshotDoc => ({
  id: yearMonth,
  accountId,
  ...splitYearMonth(yearMonth),
  amount: 1000,
  holdings: [],
  ...auditFields(),
  ...overrides,
});
