import { LEDGER_CODES, LEDGER_PREFIX } from '@/domains/ledger/constants';
import {
  type JournalEntryLine,
  type Transaction as LedgerTransaction,
} from '@/domains/ledger/schemas';
import { getTransactionCategoryLabel } from '@/ui/constants/transaction';
import { formatCurrency, formatDate } from '@/ui/utils';

const sumEntries = (transaction: LedgerTransaction) => {
  return transaction.entries.reduce(
    (acc: { debit: number; credit: number }, entry: JournalEntryLine) => {
      acc.debit += entry.debit;
      acc.credit += entry.credit;
      return acc;
    },
    { debit: 0, credit: 0 },
  );
};

const findCashEntry = (transaction: LedgerTransaction) =>
  transaction.entries.find((entry: JournalEntryLine) =>
    entry.ledgerCode.startsWith(LEDGER_CODES.ASSET_CASH),
  );

const findPrimaryEntry = (transaction: LedgerTransaction, intentType: string) => {
  const isIncome = intentType === 'INCOME';

  const investmentEntry = transaction.entries.find((entry: JournalEntryLine) =>
    entry.ledgerCode.startsWith(LEDGER_CODES.ASSET_INVESTMENT),
  );
  if (investmentEntry) return investmentEntry;

  const equityEntry = transaction.entries.find((entry: JournalEntryLine) =>
    entry.ledgerCode.startsWith(LEDGER_PREFIX.EQUITY),
  );
  if (equityEntry) return equityEntry;

  return (
    transaction.entries.find((entry: JournalEntryLine) =>
      isIncome ? entry.credit > 0 : entry.debit > 0,
    ) || transaction.entries[0]
  );
};

export type TransactionListItemVM = {
  id: string;
  intentType: string;
  displayTitle: string;
  categoryLabel: string;
  categoryKey: string;
  dateText: string;
  monthKey: string;
  sortTimestamp: number;
  signedAmount: number;
  amountText: string;
  isPositive: boolean;
  hasCashLedger: boolean;
  projectName?: string;
};

export const mapTransactionToListItemVM = (
  transaction: LedgerTransaction,
  options?: {
    projectName?: string;
    getLedgerLabel?: (code: string) => string;
  },
): TransactionListItemVM => {
  const intentType = transaction.intentType || 'MANUAL';
  const isIncome = intentType === 'INCOME';
  const { debit: totalDebit, credit: totalCredit } = sumEntries(transaction);
  const cashEntry = findCashEntry(transaction);
  const hasCashLedger = Boolean(cashEntry);

  const displayAmount = transaction.amount || (isIncome ? totalCredit : totalDebit);
  const signedAmount = cashEntry
    ? Math.abs(displayAmount) * (cashEntry.debit > 0 ? 1 : -1)
    : (isIncome ? 1 : -1) * Math.abs(displayAmount);

  const primaryEntry = findPrimaryEntry(transaction, intentType);
  const ledgerCode = primaryEntry?.ledgerCode || '';
  const categoryKey = ledgerCode.split(':').pop() || '';
  const categoryLabel = getTransactionCategoryLabel({
    intentType,
    intent: transaction.intent,
    ledgerCode,
    getLedgerLabel: options?.getLedgerLabel,
  });

  const date = new Date(transaction.date);
  const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  const sortTimestamp = date.getTime();
  const isPositive = signedAmount >= 0;

  return {
    id: transaction.id,
    intentType,
    displayTitle: transaction.description || categoryLabel,
    categoryLabel,
    categoryKey,
    dateText: formatDate(date),
    monthKey,
    sortTimestamp,
    signedAmount,
    amountText: formatCurrency(Math.abs(signedAmount)),
    isPositive,
    hasCashLedger,
    projectName: options?.projectName,
  };
};
