import { type JournalEntryLine } from '@/domains/ledger/schemas';

export interface DebtPaymentSplit {
  principal: number; // rounded to integer
  interest: number; // rounded to integer
  warning?: string; // shown when payment doesn't cover interest
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
 * Build the three journal entry lines for a DEBT_PAYMENT transaction.
 *
 * Dr. {linkedLedgerCode}   principal
 * Dr. expense:interest     interest
 * Cr. asset:cash           totalPayment
 *
 * Precondition: principal + interest must equal totalPayment (within rounding).
 * Caller is responsible for ensuring balance before calling this.
 */
export function buildDebtPaymentEntries(
  linkedLedgerCode: string,
  principal: number,
  interest: number,
  totalPayment: number,
): JournalEntryLine[] {
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
    throw new Error(
      `Journal entries are not balanced: debit=${totalDebit}, credit=${totalCredit}`,
    );
  }
}
