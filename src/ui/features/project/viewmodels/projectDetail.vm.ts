import { isTransactionProjectIncome } from '@/domains/ledger/intentMapping';
import { type Transaction } from '@/domains/ledger/schemas';
import { type ProjectSnapshot } from '@/domains/project/schemas';
import {
  PROJECT_SETTLED_LABELS,
  PROJECT_SUMMARY_LABELS,
} from '@/ui/constants/project/projectDetailLabels';
import {
  getIntentLabel,
  getIntentTypeLabel,
  getUnifiedLedgerCodeLabel,
} from '@/ui/constants/transaction';
import { formatCurrency, formatCurrencyOrDash, formatDate } from '@/ui/utils';

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
  incomeText: string;
  expenseText: string;
  netText: string;
  openingBalance: number | null;
  closingBalance: number | null;
  openingBalanceText: string;
  closingBalanceText: string;
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
  incomeText: string;
  expenseText: string;
  netText: string;
  incomeLabel: string;
  expenseLabel: string;
  netLabel: string;
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

/** Hero balance text; `null` keeps the dash so an unknown balance stays honest. */
export const toBalanceText = (balance: number | null): string | null =>
  balance === null ? null : formatCurrency(balance);

/** Settled-context line that sits under the hero balance. */
export const toLatestSettledText = (lastSettledYearMonth: string | null): string =>
  `${PROJECT_SETTLED_LABELS.PREFIX} ${lastSettledYearMonth ?? PROJECT_SETTLED_LABELS.NEVER}`;

export const toProjectSummaryVM = (totals: ProjectTotals): ProjectSummary => ({
  ...totals,
  incomeText: formatCurrency(totals.income),
  expenseText: formatCurrency(totals.expense),
  netText: formatCurrency(totals.net),
  incomeLabel: `${PROJECT_SUMMARY_LABELS.INCOME} · ${PROJECT_SUMMARY_LABELS.WINDOW_NOTE}`,
  expenseLabel: `${PROJECT_SUMMARY_LABELS.EXPENSE} · ${PROJECT_SUMMARY_LABELS.WINDOW_NOTE}`,
  netLabel: `${PROJECT_SUMMARY_LABELS.NET_CASH_FLOW} · ${PROJECT_SUMMARY_LABELS.WINDOW_NOTE}`,
});

/**
 * Groups records and snapshots by month, newest first.
 *
 * A month with a snapshot uses the settled figures for both its income/expense
 * and its opening/closing. A month without one falls back to its record totals
 * and has its balances rolled backwards from `balance` — the live balance is the
 * newest month's closing, so an unsettled newest month still has a real opening.
 * `balance` is `null` while it is loading or when it failed to load; the
 * balances are then `null` and render as a dash.
 */
export const toProjectMonthGroups = (
  records: ProjectRecordItemVM[],
  snapshots: ProjectSnapshotItemVM[],
  balance: number | null = null,
): ProjectMonthGroup[] => {
  type DraftGroup = Omit<
    ProjectMonthGroup,
    'incomeText' | 'expenseText' | 'netText' | 'openingBalanceText' | 'closingBalanceText'
  >;
  const groups = new Map<string, DraftGroup>();

  const ensureGroup = (key: string, year: number | null, month: number | null): DraftGroup => {
    const existing = groups.get(key);
    if (existing) return existing;
    const group: DraftGroup = {
      key,
      label: key,
      year,
      month,
      snapshot: null,
      records: [],
      income: 0,
      expense: 0,
      net: 0,
      openingBalance: null,
      closingBalance: null,
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

  const sorted = [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));

  let closingCursor: number | null = balance;
  sorted.forEach((group, index) => {
    if (group.snapshot) {
      group.openingBalance = group.snapshot.openingBalance;
      group.closingBalance = group.snapshot.closingBalance;
    } else {
      group.closingBalance = index === 0 ? balance : closingCursor;
      group.openingBalance =
        group.closingBalance === null ? null : group.closingBalance - group.net;
    }

    closingCursor = group.openingBalance;
  });

  return sorted.map((group) => ({
    ...group,
    incomeText: formatCurrency(group.income),
    expenseText: formatCurrency(group.expense),
    netText: formatCurrency(group.net),
    openingBalanceText: formatCurrencyOrDash(group.openingBalance),
    closingBalanceText: formatCurrencyOrDash(group.closingBalance),
  }));
};
