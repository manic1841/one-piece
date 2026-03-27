import { isTransactionProjectIncome } from '@/domains/ledger/intentMapping';
import { type Transaction } from '@/domains/ledger/schemas';
import { type ProjectSnapshot } from '@/domains/project/schemas';
import { ExpenseSubCategoryLabel, IncomeSubCategoryLabel } from '@/domains/report/labels';
import { ProjectDetailItemColors } from '@/ui/constants/project/color';
import { formatCurrency, formatDate } from '@/ui/utils';

export const ProjectDetailItemType = {
  RECORD: 'RECORD',
  SNAPSHOT: 'SNAPSHOT',
} as const;

export type ProjectDetailItemType =
  (typeof ProjectDetailItemType)[keyof typeof ProjectDetailItemType];

export interface ProjectRecordItemVM {
  id: string;
  type: 'RECORD';
  date: Date;
  dateText: string;
  amount: number;
  amountText: string;
  isIncome: boolean;
  color: string;
  title: string;
  description: string;
  categoryLabel: string;
}

export interface ProjectSnapshotItemVM {
  id: string;
  type: 'SNAPSHOT';
  date: Date;
  title: string;
  year: number;
  month: number;
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
  openingBalanceText: string;
  incomeText: string;
  expenseText: string;
  closingBalanceText: string;
}

export type ProjectDetailItemVM = ProjectRecordItemVM | ProjectSnapshotItemVM;

const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  const maybeTimestamp = value as { seconds?: number };
  if (typeof maybeTimestamp?.seconds === 'number') {
    return new Date(maybeTimestamp.seconds * 1000);
  }
  return new Date();
};

const toCategoryLabel = (category: string): string => {
  return (
    IncomeSubCategoryLabel[category as keyof typeof IncomeSubCategoryLabel] ||
    ExpenseSubCategoryLabel[category as keyof typeof ExpenseSubCategoryLabel] ||
    category ||
    'Uncategorized'
  );
};

export const mapTransactionToProjectDetailVM = (transaction: Transaction): ProjectRecordItemVM => {
  const amount = transaction.amount || 0;
  const isIncome = isTransactionProjectIncome(transaction.intentType, transaction.intent);
  const date = toDate(transaction.date);

  return {
    id: transaction.id,
    type: ProjectDetailItemType.RECORD,
    date,
    dateText: formatDate(date),
    amount: Math.abs(amount),
    amountText: `${isIncome ? '+' : '-'}${formatCurrency(Math.abs(amount))}`,
    isIncome,
    color: ProjectDetailItemColors.record,
    title: transaction.description || 'Transaction',
    description: transaction.description || '',
    categoryLabel: toCategoryLabel(transaction.intent || ''),
  };
};

export const mapSnapshotToProjectDetailVM = (snapshot: ProjectSnapshot): ProjectSnapshotItemVM => {
  return {
    id: snapshot.id,
    type: ProjectDetailItemType.SNAPSHOT,
    date: new Date(snapshot.year, snapshot.month, 0, 23, 59, 59),
    title: `Settlement: ${snapshot.year}-${snapshot.month.toString().padStart(2, '0')}`,
    year: snapshot.year,
    month: snapshot.month,
    openingBalance: snapshot.openingBalance,
    income: snapshot.income,
    expense: snapshot.expense,
    closingBalance: snapshot.closingBalance,
    openingBalanceText: formatCurrency(snapshot.openingBalance),
    incomeText: formatCurrency(snapshot.income),
    expenseText: formatCurrency(snapshot.expense),
    closingBalanceText: formatCurrency(snapshot.closingBalance),
  };
};
