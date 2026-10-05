import { signTone } from '@/ui/components/moneyTone';
import { type StatementRow } from '@/ui/components/statement/StatementTable';
import {
  type StatementMetric,
  balanceMetrics,
  cashFlowMetrics,
  incomeMetrics,
} from '@/ui/components/statement/statementMetrics';
import {
  type StatementAmountCell,
  type StatementNode,
  type StatementSectionSource,
  buildStatementRows,
} from '@/ui/components/statement/statementRows';
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
 * 已產生報表 → 共用列結構（純值、無漂移比對）。列結構本身由
 * `@/ui/components/statement/statementRows` 承擔；本層只把 VM 的數字與標籤投影成
 * 「區塊 + 金額欄」，與月度關帳的差異僅在金額來源。
 */

const amountCell = (amountText: string): StatementAmountCell => ({ amountText });

const totalLabel = (section: string): string => `${section}${MONTHLY_CLOSE_LABELS.TOTAL_SUFFIX}`;

interface StatementItemVM {
  code: string;
  label: string;
  amountText: string;
  subItems?: StatementItemVM[];
}

const itemNode = (item: StatementItemVM): StatementNode => ({
  code: item.code,
  label: item.label,
  cell: amountCell(item.amountText),
  subItems: item.subItems?.length ? item.subItems.map(itemNode) : undefined,
});

const incomeSection = (
  key: string,
  label: string,
  total: number,
  totalText: string,
  items: StatementItemVM[],
): StatementSectionSource | null => {
  if (total === 0 && items.length === 0) return null;
  return {
    key,
    label,
    totalLabel: totalLabel(label),
    cell: amountCell(totalText),
    nodes: items.map(itemNode),
  };
};

export const buildIncomeStatementRows = (vm: IncomeStatementVM): StatementRow[] => {
  const sections = [
    incomeSection(
      'income',
      MONTHLY_CLOSE_LABELS.INCOME_SECTION,
      vm.incomeTotal,
      vm.incomeTotalText,
      vm.incomeItems,
    ),
    incomeSection(
      'expense',
      MONTHLY_CLOSE_LABELS.EXPENSE_SECTION,
      vm.expenseTotal,
      vm.expenseTotalText,
      vm.expenseItems,
    ),
  ].filter((section): section is StatementSectionSource => section !== null);

  return buildStatementRows({
    sections,
    terminus: { label: MONTHLY_CLOSE_LABELS.NET_INCOME, cell: amountCell(vm.netIncomeText) },
  });
};

const balanceGroupNode = (key: string, group: BalanceSheetGroupVM): StatementNode => ({
  code: key,
  label: group.label,
  cell: amountCell(group.totalText),
  subItems: group.items.map(itemNode),
});

const hasEntries = (group: BalanceSheetGroupVM): boolean =>
  group.total !== 0 || group.items.length > 0;

/**
 * 一個資產負債表區塊。`filtered` 決定明細群組是否省略「無資料」項；權益的五個來源是
 * 固定拆分，即使為零也顯示，不讓歸零的來源被默默省略。
 */
const balanceSection = (
  key: string,
  label: string,
  total: number,
  totalText: string,
  groups: Record<string, BalanceSheetGroupVM>,
  filtered: boolean,
): StatementSectionSource | null => {
  const entries = Object.entries(groups).filter(([, group]) => !filtered || hasEntries(group));
  if (total === 0 && entries.length === 0) return null;
  return {
    key,
    label,
    totalLabel: totalLabel(label),
    cell: amountCell(totalText),
    nodes: entries.map(([groupKey, group]) => balanceGroupNode(groupKey, group)),
  };
};

export const buildBalanceSheetRows = (vm: BalanceSheetVM): StatementRow[] => {
  const sections = [
    balanceSection(
      'assets',
      MONTHLY_CLOSE_LABELS.ASSETS_SECTION,
      vm.assets.total,
      vm.assets.totalText,
      vm.assets.groups,
      true,
    ),
    balanceSection(
      'liabilities',
      MONTHLY_CLOSE_LABELS.LIABILITIES_SECTION,
      vm.liabilities.total,
      vm.liabilities.totalText,
      vm.liabilities.groups,
      true,
    ),
    balanceSection(
      'equity',
      MONTHLY_CLOSE_LABELS.EQUITY_SECTION,
      vm.equity.total,
      vm.equity.totalText,
      vm.equity.groups,
      false,
    ),
  ].filter((section): section is StatementSectionSource => section !== null);

  return buildStatementRows({
    sections,
    terminus: {
      label: MONTHLY_CLOSE_LABELS.LIABILITIES_PLUS_EQUITY,
      cell: amountCell(formatCurrency(vm.liabilities.total + vm.equity.total)),
    },
  });
};

// 流入與流出桶可能共用科目代碼，因此扁平的列需要桶範圍的 key；路徑式 key 由 builder 承擔。
const cashFlowBucketNode = (
  bucket: 'inflow' | 'outflow',
  label: string,
  items: CashFlowItemVM[],
): StatementNode | null => {
  if (items.length === 0) return null;
  const sum = items.reduce((total, item) => total + item.amount, 0);
  return {
    code: bucket,
    label,
    cell: amountCell(formatCurrency(sum)),
    subItems: items.map(itemNode),
  };
};

const cashFlowSection = (key: string, group: CashFlowGroupVM): StatementSectionSource | null => {
  const nodes = [
    cashFlowBucketNode('inflow', MONTHLY_CLOSE_LABELS.INFLOW, group.inflowItems),
    cashFlowBucketNode('outflow', MONTHLY_CLOSE_LABELS.OUTFLOW, group.outflowItems),
  ].filter((node): node is StatementNode => node !== null);

  if (group.total === 0 && nodes.length === 0) return null;
  return {
    key,
    label: group.label,
    totalLabel: totalLabel(group.label),
    cell: amountCell(group.totalText),
    nodes,
  };
};

export const buildCashFlowRows = (vm: CashFlowVM): StatementRow[] => {
  const sections = [
    cashFlowSection('operating', vm.operating),
    cashFlowSection('investing', vm.investing),
    cashFlowSection('financing', vm.financing),
  ].filter((section): section is StatementSectionSource => section !== null);

  return buildStatementRows({
    sections,
    terminus: {
      label: MONTHLY_CLOSE_LABELS.NET_CASH_CHANGE,
      cell: amountCell(vm.netCashChangeText),
    },
  });
};

/**
 * 已產生報表 → 摘要指標（純當期值，無漂移變化行）。指標的身份與順序由
 * `@/ui/components/statement/statementMetrics` 承擔；本層只提供已格式化的值。
 * 結果型指標（淨利、現金淨變動）依正負上色，與月度關帳讀起來一致。
 */
export const buildIncomeMetrics = (vm: IncomeStatementVM): StatementMetric[] =>
  incomeMetrics({
    income: { value: vm.incomeTotalText },
    expense: { value: vm.expenseTotalText },
    netIncome: { value: vm.netIncomeText, tone: signTone(vm.netIncome) },
  });

export const buildBalanceMetrics = (vm: BalanceSheetVM): StatementMetric[] =>
  balanceMetrics({
    assets: { value: vm.assets.totalText },
    liabilities: { value: vm.liabilities.totalText },
    equity: { value: vm.equity.totalText },
  });

export const buildCashFlowMetrics = (vm: CashFlowVM): StatementMetric[] =>
  cashFlowMetrics({
    beginning: { value: vm.beginningBalanceText },
    ending: { value: vm.endingBalanceText },
    netChange: { value: vm.netCashChangeText, tone: signTone(vm.netCashChange) },
  });
