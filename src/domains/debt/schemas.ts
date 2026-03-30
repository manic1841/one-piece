import { z } from 'zod';

import { LEDGER_CODES } from '@/domains/ledger/constants';
import { BaseSchema } from '@/infra/schemas/base';

// [DOMAIN ENTITY]
// DebtAccount represents a liability position such as a mortgage, car loan, or personal loan.
// It tracks the original principal, current balance, repayment schedule, and optional project linkage.

export const DebtType = z.enum(['mortgage', 'loan']);
export type DebtType = z.infer<typeof DebtType>;

export const RepaymentType = z.enum(['equal_payment']);
export type RepaymentType = z.infer<typeof RepaymentType>;

/**
 * Maps loan type to its corresponding custom LedgerCode.
 * Consumers must NOT let users pick this manually — it is derived from `type`.
 */
export const DEBT_TYPE_LEDGER_CODE: Record<DebtType, string> = {
  mortgage: LEDGER_CODES.LIABILITY_MORTGAGE,
  loan: LEDGER_CODES.LIABILITY_LOAN,
};

/** Human-readable labels for each debt type */
export const DEBT_TYPE_LABEL: Record<DebtType, string> = {
  mortgage: '房貸',
  loan: '信貸',
};

export const DebtAccountCreateSchema = z.object({
  name: z.string().min(1),
  type: DebtType,
  repaymentType: RepaymentType.default('equal_payment'),
  originalAmount: z.number().positive(),
  currentBalance: z.number().positive(),
  interestRate: z.number().min(0), // annual, in %
  startDate: z.date(),
  endDate: z.date(),
  graceEndDate: z.date().nullable().optional(), // Grace period end date; null/undefined = no grace period
  monthlyPayment: z.number().positive(),
  linkedLedgerCode: z.string(), // auto-derived from type on write
  linkedProjectId: z.string().nullable().optional(),
  note: z.string().optional(),
  isActive: z.boolean().default(true),
  closedAt: z.date().nullable().optional(),
});

export type DebtAccountCreate = z.infer<typeof DebtAccountCreateSchema>;

export const DebtAccountSchema = BaseSchema.extend(DebtAccountCreateSchema.shape).extend({
  // After final repayment, rounding can make currentBalance hit 0 or slightly below 0.
  // Keep domain reads tolerant so settled accounts are still parseable.
  currentBalance: z.number(),
});
export type DebtAccount = z.infer<typeof DebtAccountSchema>;

// ─── DebtSnapshot ────────────────────────────────────────────────────────────
// Path: households/{householdId}/debtAccounts/{debtAccountId}/snapshots/{yyyy-MM}
// Written after every DEBT_PAYMENT transaction. Same-month payments are cumulated.

export const DebtSnapshotCreateSchema = z.object({
  yearMonth: z.string(), // 'YYYY-MM'
  openingBalance: z.number(),
  principalPaid: z.number(),
  interestPaid: z.number(),
  totalPaid: z.number(),
  closingBalance: z.number(),
});
export type DebtSnapshotCreate = z.infer<typeof DebtSnapshotCreateSchema>;

export const DebtSnapshotSchema = BaseSchema.extend(DebtSnapshotCreateSchema.shape);
export type DebtSnapshot = z.infer<typeof DebtSnapshotSchema>;
