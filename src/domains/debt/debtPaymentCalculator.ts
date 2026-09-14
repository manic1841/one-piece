import { type JournalEntryLine } from '@/domains/ledger/schemas';

export const DebtPaymentErrorCode = {
  INVALID_PAYMENT: 'INVALID_PAYMENT',
  PAYMENT_EXCEEDS_PRINCIPAL: 'PAYMENT_EXCEEDS_PRINCIPAL',
  GRACE_PERIOD_PAYMENT_EXCEEDS_INTEREST: 'GRACE_PERIOD_PAYMENT_EXCEEDS_INTEREST',
} as const;

export type DebtPaymentErrorCode = (typeof DebtPaymentErrorCode)[keyof typeof DebtPaymentErrorCode];

export class DebtPaymentError extends Error {
  readonly code: DebtPaymentErrorCode;

  constructor(
    code: DebtPaymentErrorCode,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.code = code;
    this.name = 'DebtPaymentError';
  }
}

export interface DebtPaymentSplit {
  principal: number;
  interest: number;
  warning?: string;
}

export interface DebtPaymentCalculationInput {
  currentBalance: number;
  interestRate: number;
  totalPayment: number;
  paymentDate: Date;
  startDate: Date;
  graceEndDate?: Date | null;
}

export interface DebtPaymentCalculation extends DebtPaymentSplit {
  inGracePeriod: boolean;
}

export function isInGracePeriod(
  startDate: Date | null | undefined,
  paymentDate: Date | null | undefined,
  graceEndDate: Date | null | undefined,
): boolean {
  if (!startDate || !paymentDate || !graceEndDate) return false;

  const start = new Date(startDate);
  const payment = new Date(paymentDate);
  const graceEnd = new Date(graceEndDate);
  start.setHours(0, 0, 0, 0);
  payment.setHours(0, 0, 0, 0);
  graceEnd.setHours(0, 0, 0, 0);

  return start <= payment && payment < graceEnd;
}

/**
 * Whether a loan's repayment period covers a given month, compared at month
 * granularity: the start month and the maturity month are both included.
 * Completeness checking needs whole-month resolution (issue #95), so a loan
 * ending on 2026-08-31 does not cover September and one maturing 2026-09-05
 * still does. Both dates are required on DebtAccount, so callers always pass a
 * real Date; an unparseable date yields NaN month indices and compares false,
 * which safely treats the loan as not covering the month.
 *
 * The grace period does not exempt a month: grace-period payments are recorded
 * as interest-only DEBT_PAYMENT entries (ADR-0017), so zero activity there is
 * still a missing record.
 */
export function isLoanActiveInMonth(startDate: Date, endDate: Date, monthStart: Date): boolean {
  const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();
  const target = monthIndex(monthStart);

  return monthIndex(startDate) <= target && target <= monthIndex(endDate);
}

const roundAmount = (amount: number): number => Math.round(amount * 100) / 100;

const calculateMonthlyInterest = (currentBalance: number, interestRate: number): number =>
  roundAmount(currentBalance * (interestRate / 100 / 12));

/**
 * Calculate monthly interest payment during grace period.
 *
 * Formula: currentBalance × (interestRate / 100 / 12)
 *
 * @returns Monthly interest amount (rounded)
 */
export function calculateGraceMonthlyPayment(
  currentBalance: number,
  interestRate: number, // annual, in %
): number {
  return calculateMonthlyInterest(currentBalance, interestRate);
}

export function calculateDebtPayment(
  input: DebtPaymentCalculationInput,
): DebtPaymentCalculation {
  const { currentBalance, interestRate, totalPayment, paymentDate, startDate, graceEndDate } = input;

  if (!Number.isFinite(totalPayment) || totalPayment <= 0) {
    throw new DebtPaymentError(
      DebtPaymentErrorCode.INVALID_PAYMENT,
      'total payment must be a finite positive amount',
    );
  }
  if (!Number.isFinite(currentBalance) || currentBalance < 0) {
    throw new DebtPaymentError(
      DebtPaymentErrorCode.INVALID_PAYMENT,
      'current balance must be a finite non-negative amount',
    );
  }
  if (!Number.isFinite(interestRate) || interestRate < 0) {
    throw new DebtPaymentError(
      DebtPaymentErrorCode.INVALID_PAYMENT,
      'interest rate must be a finite non-negative amount',
    );
  }

  const payment = roundAmount(totalPayment);
  if (payment <= 0) {
    throw new DebtPaymentError(
      DebtPaymentErrorCode.INVALID_PAYMENT,
      'total payment is below the supported precision',
    );
  }

  const applicableInterest = calculateMonthlyInterest(currentBalance, interestRate);
  const inGracePeriod = isInGracePeriod(startDate, paymentDate, graceEndDate);

  if (inGracePeriod && payment > applicableInterest) {
    throw new DebtPaymentError(
      DebtPaymentErrorCode.GRACE_PERIOD_PAYMENT_EXCEEDS_INTEREST,
      `grace-period payment cannot exceed applicable interest (${applicableInterest})`,
    );
  }

  if (payment <= applicableInterest) {
    return {
      principal: 0,
      interest: payment,
      warning:
        payment < applicableInterest
          ? `還款金額 (${payment.toLocaleString()}) 不足以覆蓋本月利息 (${applicableInterest.toLocaleString()})，本金未能攤還`
          : undefined,
      inGracePeriod,
    };
  }

  const principal = roundAmount(payment - applicableInterest);
  if (!inGracePeriod && principal > currentBalance) {
    throw new DebtPaymentError(
      DebtPaymentErrorCode.PAYMENT_EXCEEDS_PRINCIPAL,
      `calculated principal (${principal}) exceeds remaining principal (${currentBalance})`,
    );
  }

  return { principal, interest: applicableInterest, inGracePeriod };
}

/**
 * Calculate the principal/interest split for a single payment.
 *
 * Formula:
 *   interest  = currentBalance × (interestRate / 100 / 12)
 *   principal = totalPayment - interest
 *
 * Edge cases:
 *   - interestRate = 0 → interest = 0, principal = totalPayment
 *   - totalPayment ≤ interest → principal ≤ 0, returns warning
 */
export function calculateSplit(
  currentBalance: number,
  interestRate: number, // annual, in %
  totalPayment: number,
): DebtPaymentSplit {
  const interest = calculateMonthlyInterest(currentBalance, interestRate);
  const payment = roundAmount(totalPayment);
  const principal = roundAmount(payment - interest);

  if (principal <= 0) {
    return {
      principal: 0,
      interest: payment,
      warning: `還款金額 (${payment.toLocaleString()}) 不足以覆蓋本月利息 (${interest.toLocaleString()})，本金未能攤還`,
    };
  }

  return { principal, interest };
}

/**
 * Build the journal entry lines for a DEBT_PAYMENT transaction.
 *
 * Supports two scenarios:
 *
 * 1. Normal repayment (no grace period or after grace period):
 *    - Dr. {linkedLedgerCode}  principal
 *    - Dr. expense:interest    interest
 *    - Cr. asset:cash          totalPayment
 *
 * 2. Grace period (within grace period, interest-only):
 *    - Dr. expense:interest    interest
 *    - Cr. asset:cash          totalPayment (same as interest)
 *    - Note: Principal remains 0, no liability reduction
 *
 * @param linkedLedgerCode The liability ledger code (e.g., 'liability:mortgage')
 * @param calculation Validated principal/interest split and grace-period state
 * @param totalPayment Total cash paid
 * @returns Array of journal entry lines
 */
export function buildDebtPaymentEntries(
  linkedLedgerCode: string,
  calculation: DebtPaymentCalculation,
  totalPayment: number,
): JournalEntryLine[] {
  const { principal, interest, inGracePeriod } = calculation;

  if (inGracePeriod) {
    const entries: JournalEntryLine[] = [
      { ledgerCode: 'expense:interest', debit: interest, credit: 0 },
      { ledgerCode: 'asset:cash', debit: 0, credit: totalPayment },
    ];

    return entries.filter((e) => e.debit > 0 || e.credit > 0);
  }

  const entries: JournalEntryLine[] = [
    { ledgerCode: linkedLedgerCode, debit: principal, credit: 0 },
    { ledgerCode: 'expense:interest', debit: interest, credit: 0 },
    { ledgerCode: 'asset:cash', debit: 0, credit: totalPayment },
  ];

  return entries.filter((e) => e.debit > 0 || e.credit > 0);
}

/**
 * Validates that the journal entries are balanced (debits = credits).
 * Throws if unbalanced.
 */
export function assertEntriesBalanced(entries: JournalEntryLine[]): void {
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 1) {
    // tolerance of 1 for rounding
    throw new Error(`Journal entries are not balanced: debit=${totalDebit}, credit=${totalCredit}`);
  }
}
