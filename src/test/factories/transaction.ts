import type { FieldValue } from 'firebase/firestore';

import { auditFields } from './audit';

export interface EntryDoc {
  ledgerCode: string;
  debit: number;
  credit: number;
}

export interface TransactionDoc {
  id: string;
  date: Date;
  description: string;
  intent: string;
  intentType: string;
  amount: number;
  projectId: string | null;
  allocationId: string | null;
  /** Set on DEBT_PAYMENT docs: the debt account the repayment belongs to. */
  debtAccountId?: string | null;
  /** Denormalized set of entry ledger codes; DEBT_PAYMENT docs carry it. */
  ledgerCodes?: string[];
  entries: EntryDoc[];
  createdAt: FieldValue;
  updatedAt: FieldValue;
  createdBy: string;
  updatedBy: string;
}

export const buildTransaction = (
  id: string,
  overrides: Partial<TransactionDoc> = {},
): TransactionDoc => ({
  id,
  date: new Date('2026-03-15'),
  description: '',
  intent: 'SALARY',
  intentType: 'INCOME',
  amount: 0,
  projectId: null,
  allocationId: null,
  entries: [],
  ...auditFields(),
  ...overrides,
});
