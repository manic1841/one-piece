import {
  calculateGraceMonthlyPayment,
  isInGracePeriod,
} from '@/domains/debt/debtPaymentCalculator';
import { DEBT_TYPE_LABEL, type DebtAccount, type DebtType } from '@/domains/debt/schemas';
import { type Transaction } from '@/domains/ledger/schemas';

const formatYmd = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatYearMonth = (date: Date | null): string => {
  if (!date) return '—';
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
};

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

const getPrincipalInterest = (
  transaction: Transaction,
): {
  principal: number;
  interest: number;
} => {
  const principal =
    transaction.entries.find((entry) => entry.ledgerCode.startsWith('liability:'))?.debit || 0;
  const interest =
    transaction.entries.find((entry) => entry.ledgerCode === 'expense:interest')?.debit || 0;

  return { principal, interest };
};

export interface DebtAccountDisplayVM extends DebtAccount {
  payoffDate: Date | null;
  repaidPercent: number;
  projectName: string | null;
  typeLabel: string;
  inGracePeriod: boolean;
  graceEndYearMonthText: string;
  monthlyDueAmount: number;
}

export interface DebtPaymentHistoryItemVM {
  id: string;
  dateText: string;
  descriptionText: string;
  principalText: string;
  interestText: string;
  totalText: string;
}

export const mapDebtAccountToDisplayVM = (
  account: DebtAccount,
  projectName: string | null,
): DebtAccountDisplayVM => {
  const inGracePeriod = isInGracePeriod(account.graceEndDate);
  return {
    ...account,
    payoffDate: estimatePayoffDate(account),
    repaidPercent:
      account.originalAmount > 0
        ? Math.round(
            ((account.originalAmount - account.currentBalance) / account.originalAmount) * 100,
          )
        : 0,
    projectName,
    typeLabel: DEBT_TYPE_LABEL[account.type as DebtType],
    inGracePeriod,
    graceEndYearMonthText:
      account.graceEndDate && inGracePeriod ? formatYearMonth(account.graceEndDate) : '',
    monthlyDueAmount: inGracePeriod
      ? calculateGraceMonthlyPayment(account.currentBalance, account.interestRate)
      : account.monthlyPayment,
  };
};

export const mapDebtPaymentTransactionToHistoryVM = (
  transaction: Transaction,
): DebtPaymentHistoryItemVM => {
  const split = getPrincipalInterest(transaction);

  return {
    id: transaction.id,
    dateText: formatYmd(transaction.date),
    descriptionText: transaction.description || '—',
    principalText: `$${split.principal.toLocaleString()}`,
    interestText: `$${split.interest.toLocaleString()}`,
    totalText: `$${(transaction.amount || 0).toLocaleString()}`,
  };
};
