import type { FieldValue } from 'firebase/firestore';

import { auditFields } from './audit';

export interface DebtAccountDoc {
  id: string;
  name: string;
  type: string;
  repaymentType: string;
  originalAmount: number;
  currentBalance: number;
  interestRate: number;
  startDate: FieldValue;
  endDate: FieldValue;
  graceEndDate: FieldValue | null;
  monthlyPayment: number;
  linkedLedgerCode: string;
  linkedProjectId: string | null;
  isActive: boolean;
  createdAt: FieldValue;
  updatedAt: FieldValue;
  createdBy: string;
  updatedBy: string;
}

export interface DebtSnapshotDoc {
  id: string;
  yearMonth: string;
  openingBalance: number;
  principalPaid: number;
  interestPaid: number;
  totalPaid: number;
  closingBalance: number;
  createdAt: FieldValue;
  updatedAt: FieldValue;
  createdBy: string;
  updatedBy: string;
}

export const buildDebtAccount = (
  id: string,
  overrides: Partial<DebtAccountDoc> = {},
): DebtAccountDoc => {
  const audit = auditFields();
  return {
    id,
    name: `Debt ${id}`,
    type: 'mortgage',
    repaymentType: 'equal_payment',
    originalAmount: 1_000_000,
    currentBalance: 900_000,
    interestRate: 2.1,
    startDate: audit.createdAt,
    endDate: audit.createdAt,
    graceEndDate: null,
    monthlyPayment: 35_000,
    linkedLedgerCode: 'liability:mortgage',
    linkedProjectId: null,
    isActive: true,
    ...audit,
    ...overrides,
  };
};

export const buildDebtSnapshot = (
  yearMonth: string,
  overrides: Partial<DebtSnapshotDoc> = {},
): DebtSnapshotDoc => ({
  id: yearMonth,
  yearMonth,
  openingBalance: 1_000_000,
  principalPaid: 30_000,
  interestPaid: 5_000,
  totalPaid: 35_000,
  closingBalance: 970_000,
  ...auditFields(),
  ...overrides,
});
