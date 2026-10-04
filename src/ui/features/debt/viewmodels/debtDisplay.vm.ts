import {
  calculateGraceMonthlyPayment,
  isInGracePeriod,
  parseDebtPaymentEntries,
} from '@/domains/debt/debtPaymentCalculator';
import { type DebtAccount, type DebtSnapshot, type DebtType } from '@/domains/debt/schemas';
import { type Transaction } from '@/domains/ledger/schemas';
import { DebtTypeLabels } from '@/ui/constants/debt/label';
import { formatCurrency, formatDate } from '@/ui/utils';

export type { DebtAccount, DebtSnapshot, DebtType };

const estimatePayoffDate = (account: DebtAccount): Date | null => {
  const { currentBalance, interestRate, monthlyPayment } = account;
  if (monthlyPayment <= 0) return null;

  if (interestRate === 0) {
    const months = Math.ceil(currentBalance / monthlyPayment);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  }

  const r = interestRate / 100 / 12;
  const ratio = (currentBalance * r) / monthlyPayment;
  if (ratio >= 1) return null;
  const n = -Math.log(1 - ratio) / Math.log(1 + r);
  const months = Math.ceil(n);
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
};

export interface DebtAccountDisplayVM extends DebtAccount {
  payoffDate: Date | null;
  repaidPercent: number;
  projectName: string | null;
  typeLabel: string;
  inGracePeriod: boolean;
  monthlyDueAmount: number;
}

export const mapDebtAccountToDisplayVM = (
  account: DebtAccount,
  projectName: string | null,
): DebtAccountDisplayVM => {
  const inGracePeriod = isInGracePeriod(account.startDate, new Date(), account.graceEndDate);
  return {
    ...account,
    payoffDate: estimatePayoffDate(account),
    repaidPercent:
      account.originalAmount > 0
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                ((account.originalAmount - account.currentBalance) / account.originalAmount) * 100,
              ),
            ),
          )
        : 0,
    projectName,
    typeLabel: DebtTypeLabels[account.type as DebtType],
    inGracePeriod,
    monthlyDueAmount: inGracePeriod
      ? calculateGraceMonthlyPayment(account.currentBalance, account.interestRate)
      : account.monthlyPayment,
  };
};

export interface DebtPaymentHistoryItemVM {
  id: string;
  yearMonth: string;
  dateText: string;
  descriptionText: string;
  principalText: string;
  interestText: string;
  totalText: string;
}

const toYearMonth = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/**
 * One repayment history row for the debt detail table. The principal/interest
 * split is read back out of the transaction's entries by the domain's
 * `parseDebtPaymentEntries` (the inverse of `buildDebtPaymentEntries`), so the
 * rule has a single home and the table never re-derives it inline.
 */
export const mapDebtPaymentTransactionToHistoryVM = (
  transaction: Transaction,
  options?: { linkedLedgerCode?: string | null },
): DebtPaymentHistoryItemVM => {
  const split = parseDebtPaymentEntries(transaction.entries, options);

  return {
    id: transaction.id,
    yearMonth: toYearMonth(transaction.date),
    dateText: formatDate(transaction.date),
    // `description` is the field that carries the payment note; the previous
    // code read a non-existent `note` and so always showed the fallback.
    descriptionText: transaction.description?.trim() || '還款',
    principalText: formatCurrency(split.principal),
    interestText: formatCurrency(split.interest),
    totalText: formatCurrency(split.total),
  };
};

export interface DebtHistoryMonthVM {
  key: string;
  yearMonth: string;
  openingText: string;
  principalText: string;
  interestText: string;
  closingText: string;
  payments: DebtPaymentHistoryItemVM[];
}

/**
 * Merges the monthly snapshots and the repayment rows into one history: each
 * month is a row whose payments expand beneath it. A month that only has a
 * payment -- a repayment recorded before that month's snapshot exists -- still
 * gets a row, so no payment is dropped; its snapshot columns read `—`.
 */
export const mapDebtHistoryMonths = (
  snapshots: DebtSnapshot[],
  payments: DebtPaymentHistoryItemVM[],
): DebtHistoryMonthVM[] => {
  const snapshotByMonth = new Map(snapshots.map((snapshot) => [snapshot.yearMonth, snapshot]));
  const paymentsByMonth = new Map<string, DebtPaymentHistoryItemVM[]>();
  for (const payment of payments) {
    const group = paymentsByMonth.get(payment.yearMonth);
    if (group) group.push(payment);
    else paymentsByMonth.set(payment.yearMonth, [payment]);
  }

  const months = [...new Set([...snapshotByMonth.keys(), ...paymentsByMonth.keys()])].sort((a, b) =>
    b.localeCompare(a),
  );

  return months.map((yearMonth) => {
    const snapshot = snapshotByMonth.get(yearMonth);
    return {
      key: yearMonth,
      yearMonth,
      openingText: snapshot ? formatCurrency(snapshot.openingBalance) : '—',
      principalText: snapshot ? formatCurrency(snapshot.principalPaid) : '—',
      interestText: snapshot ? formatCurrency(snapshot.interestPaid) : '—',
      closingText: snapshot ? formatCurrency(snapshot.closingBalance) : '—',
      payments: paymentsByMonth.get(yearMonth) ?? [],
    };
  });
};
