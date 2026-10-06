import { isTransactionProjectIncome } from '@/domains/ledger/intentMapping';
import { type Transaction } from '@/domains/ledger/schemas';
import { type ProjectSnapshot } from '@/domains/project/schemas';
import {
  getIntentLabel,
  getIntentTypeLabel,
  getUnifiedLedgerCodeLabel,
} from '@/ui/constants/transaction';
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
  categoryLabel: string;
  monthKey: string;
}

export interface ProjectSnapshotItemVM {
  id: string;
  type: 'SNAPSHOT';
  date: Date;
  year: number;
  month: number;
  monthKey: string;
  monthLabel: string;
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
  openingBalanceText: string;
  incomeText: string;
  expenseText: string;
  closingBalanceText: string;
}

export interface ProjectMonthGroup {
  key: string;
  label: string;
  year: number | null;
  month: number | null;
  snapshot: ProjectSnapshotItemVM | null;
  records: ProjectRecordItemVM[];
  income: number;
  expense: number;
  net: number;
}

export interface ProjectTotals {
  income: number;
  expense: number;
  net: number;
}

/** 專案詳情上方 summary 的呈現資料。 */
export interface ProjectSummary {
  income: number;
  expense: number;
  net: number;
  balanceText: string;
}

/** 專案詳情「連結貸款」表的列。 */
export interface ProjectDebtRow {
  id: string;
  name: string;
  balanceText: string;
}

const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  const maybeTimestamp = value as { seconds?: number };
  if (typeof maybeTimestamp?.seconds === 'number') {
    return new Date(maybeTimestamp.seconds * 1000);
  }
  return new Date();
};

const toMonthKey = (year: number, month: number): string =>
  `${year}-${month.toString().padStart(2, '0')}`;

const toMonthKeyFromDate = (date: Date): string =>
  toMonthKey(date.getFullYear(), date.getMonth() + 1);

const toPrimaryLedgerCode = (transaction: Transaction): string | undefined => {
  const nonCashEntry = transaction.entries.find((entry) => entry.ledgerCode !== 'asset:cash');
  return nonCashEntry?.ledgerCode;
};

const toCategoryLabel = (transaction: Transaction): string => {
  const intentLabel = getIntentLabel(transaction.intent);
  if (intentLabel) return intentLabel;

  const ledgerCode = toPrimaryLedgerCode(transaction);
  if (ledgerCode) {
    const ledgerLabel = getUnifiedLedgerCodeLabel(ledgerCode);
    if (ledgerLabel) return ledgerLabel;
  }

  const intentTypeLabel = getIntentTypeLabel(transaction.intentType);
  if (intentTypeLabel) return intentTypeLabel;

  return '未分類';
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
    categoryLabel: toCategoryLabel(transaction),
    monthKey: toMonthKeyFromDate(date),
  };
};

export const mapSnapshotToProjectDetailVM = (snapshot: ProjectSnapshot): ProjectSnapshotItemVM => {
  const monthKey = toMonthKey(snapshot.year, snapshot.month);
  return {
    id: snapshot.id,
    type: ProjectDetailItemType.SNAPSHOT,
    date: new Date(snapshot.year, snapshot.month, 0, 23, 59, 59),
    year: snapshot.year,
    month: snapshot.month,
    monthKey,
    monthLabel: monthKey,
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

export const toProjectTotals = (records: ProjectRecordItemVM[]): ProjectTotals => {
  const income = records.filter((r) => r.isIncome).reduce((sum, r) => sum + r.amount, 0);
  const expense = records.filter((r) => !r.isIncome).reduce((sum, r) => sum + r.amount, 0);
  return { income, expense, net: income - expense };
};

export const PROJECT_SUMMARY_WINDOW_MONTHS = 12;

export const toRecentTotals = (
  groups: ProjectMonthGroup[],
  months: number = PROJECT_SUMMARY_WINDOW_MONTHS,
): ProjectTotals => {
  const windowed = groups.slice(0, months);
  const income = windowed.reduce((sum, group) => sum + group.income, 0);
  const expense = windowed.reduce((sum, group) => sum + group.expense, 0);
  return { income, expense, net: income - expense };
};

/** 有快照的月份以快照數值為準（權威結算值），否則退回明細合計。 */
export const toProjectMonthGroups = (
  records: ProjectRecordItemVM[],
  snapshots: ProjectSnapshotItemVM[],
): ProjectMonthGroup[] => {
  const groups = new Map<string, ProjectMonthGroup>();

  const ensureGroup = (
    key: string,
    year: number | null,
    month: number | null,
  ): ProjectMonthGroup => {
    const existing = groups.get(key);
    if (existing) return existing;
    const group: ProjectMonthGroup = {
      key,
      label: key,
      year,
      month,
      snapshot: null,
      records: [],
      income: 0,
      expense: 0,
      net: 0,
    };
    groups.set(key, group);
    return group;
  };

  for (const snapshot of snapshots) {
    const group = ensureGroup(snapshot.monthKey, snapshot.year, snapshot.month);
    group.snapshot = snapshot;
    group.label = snapshot.monthLabel;
  }

  for (const record of records) {
    const group = ensureGroup(record.monthKey, null, null);
    group.records.push(record);
  }

  for (const group of groups.values()) {
    group.records.sort((a, b) => b.date.getTime() - a.date.getTime());
    const totals = toProjectTotals(group.records);
    group.income = group.snapshot?.income ?? totals.income;
    group.expense = group.snapshot?.expense ?? totals.expense;
    group.net = group.income - group.expense;
  }

  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
};

export const toLatestSnapshot = (
  snapshots: ProjectSnapshotItemVM[],
): ProjectSnapshotItemVM | null =>
  snapshots.reduce<ProjectSnapshotItemVM | null>(
    (latest, snapshot) => (!latest || snapshot.monthKey > latest.monthKey ? snapshot : latest),
    null,
  );
