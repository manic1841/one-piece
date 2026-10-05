import { type StatementRow } from '@/ui/components/statement/StatementTable';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { formatCurrency } from '@/ui/utils';

import {
  type BalanceSheetGroupVM,
  type BalanceSheetVM,
  type CashFlowGroupVM,
  type CashFlowItemVM,
  type CashFlowVM,
  type IncomeStatementVM,
} from './reportDisplay.vm';

/**
 * 已產生報表 → 共用 `StatementTable` 的列（純值、無漂移比對）。與月度關帳的
 * 差異只在金額：此處直接傳入已格式化的金額文字，不做「已產生 → 預覽」比較。
 */
const TOTAL_SUFFIX = MONTHLY_CLOSE_LABELS.TOTAL_SUFFIX;

const LEVEL_TONES: readonly StatementRow['tone'][] = ['group', 'detail', 'deepDetail'];

const toneForLevel = (level: number): StatementRow['tone'] =>
  LEVEL_TONES[level - 1] ?? 'deepDetail';

const sectionRow = (key: string, label: string, children: StatementRow[]): StatementRow => ({
  key,
  label,
  amountText: null,
  tone: 'section',
  level: 0,
  children,
});

const totalRow = (key: string, label: string, amountText: string): StatementRow => ({
  key,
  label: `${label}${TOTAL_SUFFIX}`,
  amountText,
  tone: 'subtotal',
  level: 0,
  children: [],
});

const terminusRow = (key: string, label: string, amountText: string): StatementRow => ({
  key,
  label,
  amountText,
  tone: 'terminus',
  level: 0,
  children: [],
});

interface PlainItem {
  code: string;
  label: string;
  amountText: string;
  subItems?: PlainItem[];
}

const itemRows = (items: PlainItem[], level: number, keyPrefix = ''): StatementRow[] =>
  items.map((item) => ({
    key: `${keyPrefix}${item.code}`,
    label: item.label,
    amountText: item.amountText,
    tone: toneForLevel(level),
    level,
    children: item.subItems?.length ? itemRows(item.subItems, level + 1, keyPrefix) : [],
  }));

export const buildIncomeStatementRows = (vm: IncomeStatementVM): StatementRow[] => {
  const rows: StatementRow[] = [];
  if (vm.incomeTotal !== 0 || vm.incomeItems.length > 0) {
    rows.push(
      sectionRow(
        'section:income',
        MONTHLY_CLOSE_LABELS.INCOME_SECTION,
        itemRows(vm.incomeItems, 1),
      ),
    );
    rows.push(totalRow('total:income', MONTHLY_CLOSE_LABELS.INCOME_SECTION, vm.incomeTotalText));
  }
  if (vm.expenseTotal !== 0 || vm.expenseItems.length > 0) {
    rows.push(
      sectionRow(
        'section:expense',
        MONTHLY_CLOSE_LABELS.EXPENSE_SECTION,
        itemRows(vm.expenseItems, 1),
      ),
    );
    rows.push(totalRow('total:expense', MONTHLY_CLOSE_LABELS.EXPENSE_SECTION, vm.expenseTotalText));
  }
  rows.push(terminusRow('terminus:netIncome', MONTHLY_CLOSE_LABELS.NET_INCOME, vm.netIncomeText));
  return rows;
};

const balanceGroupRow = (key: string, group: BalanceSheetGroupVM): StatementRow => ({
  key,
  label: group.label,
  amountText: group.totalText,
  tone: 'group',
  level: 1,
  children: itemRows(group.items, 2),
});

const hasEntries = (group: BalanceSheetGroupVM): boolean =>
  group.total !== 0 || group.items.length > 0;

const balanceSection = (
  key: string,
  label: string,
  totalText: string,
  groups: [string, BalanceSheetGroupVM][],
): StatementRow[] => [
  sectionRow(
    `section:${key}`,
    label,
    groups.map(([groupKey, group]) => balanceGroupRow(`${key}:${groupKey}`, group)),
  ),
  totalRow(`total:${key}`, label, totalText),
];

export const buildBalanceSheetRows = (vm: BalanceSheetVM): StatementRow[] => {
  const rows: StatementRow[] = [];

  const assetGroups = Object.entries(vm.assets.groups).filter(([, group]) => hasEntries(group));
  if (vm.assets.total !== 0 || assetGroups.length > 0) {
    rows.push(
      ...balanceSection(
        'assets',
        MONTHLY_CLOSE_LABELS.ASSETS_SECTION,
        vm.assets.totalText,
        assetGroups,
      ),
    );
  }

  const liabilityGroups = Object.entries(vm.liabilities.groups).filter(([, group]) =>
    hasEntries(group),
  );
  if (vm.liabilities.total !== 0 || liabilityGroups.length > 0) {
    rows.push(
      ...balanceSection(
        'liabilities',
        MONTHLY_CLOSE_LABELS.LIABILITIES_SECTION,
        vm.liabilities.totalText,
        liabilityGroups,
      ),
    );
  }

  // 權益的五個來源是固定拆分，即使為零也顯示，不讓歸零的來源被默默省略。
  const equityGroups = Object.entries(vm.equity.groups);
  if (vm.equity.total !== 0 || equityGroups.length > 0) {
    rows.push(
      ...balanceSection(
        'equity',
        MONTHLY_CLOSE_LABELS.EQUITY_SECTION,
        vm.equity.totalText,
        equityGroups,
      ),
    );
  }

  rows.push(
    terminusRow(
      'terminus:liabilitiesPlusEquity',
      MONTHLY_CLOSE_LABELS.LIABILITIES_PLUS_EQUITY,
      formatCurrency(vm.liabilities.total + vm.equity.total),
    ),
  );

  return rows;
};

// 流入與流出桶可能共用科目代碼，因此扁平的列需要桶範圍的 key，否則重複 key 會在收合／展開時留下 ghost row。
const cashFlowGroupRow = (
  key: string,
  label: string,
  items: CashFlowItemVM[],
  totalText: string,
  keyPrefix: string,
): StatementRow | null => {
  if (items.length === 0) return null;
  return {
    key,
    label,
    amountText: totalText,
    tone: 'group',
    level: 1,
    children: itemRows(items, 2, keyPrefix),
  };
};

const buildCashFlowGroup = (key: string, group: CashFlowGroupVM): StatementRow[] => {
  const hasItems = group.inflowItems.length > 0 || group.outflowItems.length > 0;
  if (group.total === 0 && !hasItems) return [];
  const children = [
    cashFlowGroupRow(
      `${key}:inflow`,
      MONTHLY_CLOSE_LABELS.INFLOW,
      group.inflowItems,
      formatCurrency(group.inflowItems.reduce((sum, item) => sum + item.amount, 0)),
      'inflow:',
    ),
    cashFlowGroupRow(
      `${key}:outflow`,
      MONTHLY_CLOSE_LABELS.OUTFLOW,
      group.outflowItems,
      formatCurrency(group.outflowItems.reduce((sum, item) => sum + item.amount, 0)),
      'outflow:',
    ),
  ].filter((row): row is StatementRow => row !== null);
  return [
    sectionRow(`section:${key}`, group.label, children),
    totalRow(`total:${key}`, group.label, group.totalText),
  ];
};

export const buildCashFlowRows = (vm: CashFlowVM): StatementRow[] => {
  const rows: StatementRow[] = [
    ...buildCashFlowGroup('operating', vm.operating),
    ...buildCashFlowGroup('investing', vm.investing),
    ...buildCashFlowGroup('financing', vm.financing),
  ];
  rows.push(
    terminusRow(
      'terminus:netCashChange',
      MONTHLY_CLOSE_LABELS.NET_CASH_CHANGE,
      vm.netCashChangeText,
    ),
  );
  return rows;
};
