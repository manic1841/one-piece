import { type JournalEntryLine } from '@/domains/ledger/schemas';

export interface DebtPaymentSplit {
  principal: number; // rounded to integer
  interest: number; // rounded to integer
  warning?: string; // shown when payment doesn't cover interest
}

/**
 * Check if today is within the grace period.
 *
 * @param graceEndDate The grace period end date (null/undefined means no grace period)
 * @returns true if graceEndDate is set and today < graceEndDate
 */
export function isInGracePeriod(graceEndDate: Date | null | undefined): boolean {
  if (!graceEndDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const graceEnd = new Date(graceEndDate);
  graceEnd.setHours(0, 0, 0, 0);
  return today < graceEnd;
}

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
  const monthlyInterest = currentBalance * (interestRate / 100 / 12);
  return Math.round(monthlyInterest);
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
  const monthlyInterestRaw = currentBalance * (interestRate / 100 / 12);
  const interest = Math.round(monthlyInterestRaw);
  const principal = Math.round(totalPayment) - interest;

  if (principal <= 0) {
    return {
      principal: 0,
      interest: Math.round(totalPayment),
      warning: `還款金額 (${totalPayment.toLocaleString()}) 不足以覆蓋本月利息 (${interest.toLocaleString()})，本金未能攤還`,
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
 * @param principal Amount to reduce principal (0 during grace period)
 * @param interest Interest amount to record as expense
 * @param totalPayment Total cash paid
 * @param graceEndDate Optional grace period end date; if set and today < graceEndDate, only interest is recorded
 * @returns Array of journal entry lines
 */
export function buildDebtPaymentEntries(
  linkedLedgerCode: string,
  principal: number,
  interest: number,
  totalPayment: number,
  graceEndDate?: Date | null,
): JournalEntryLine[] {
  // Check if currently in grace period
  const inGracePeriod = isInGracePeriod(graceEndDate);

  if (inGracePeriod) {
    // Grace period: interest-only payment, no principal reduction
    const entries: JournalEntryLine[] = [
      // Record interest expense
      { ledgerCode: 'expense:interest', debit: interest, credit: 0 },
      // Cash paid out
      { ledgerCode: 'asset:cash', debit: 0, credit: totalPayment },
    ];

    // Filter out zero-value lines
    return entries.filter((e) => e.debit > 0 || e.credit > 0);
  }

  // Normal repayment (no grace period or after grace period)
  const entries: JournalEntryLine[] = [
    // Reduce liability (debit the liability ledger code)
    { ledgerCode: linkedLedgerCode, debit: principal, credit: 0 },
    // Record interest expense
    { ledgerCode: 'expense:interest', debit: interest, credit: 0 },
    // Cash paid out
    { ledgerCode: 'asset:cash', debit: 0, credit: totalPayment },
  ];

  // Filter out zero-value interest line when interestRate = 0
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
