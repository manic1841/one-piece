import React from 'react';

import { type StatementRow, StatementTable } from '@/ui/components/statement/StatementTable';
import {
  type StatementAmountCell,
  type StatementNode,
  type StatementSectionSource,
  buildStatementRows,
} from '@/ui/components/statement/statementRows';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { cn } from '@/ui/utils/cn';

import {
  type BalanceSheetDrift,
  type CashFlowDrift,
  type DriftAmount,
  type DriftGroup,
  type DriftItem,
  type IncomeStatementDrift,
  combineDrift,
  formatDriftAmountText,
  isDrifted,
} from '../../../viewmodels/reportDrift.vm';

/** 漂移金額 → 共用列的金額欄位：文字為 delta 或原值，警示色標記已漂移。 */
const driftCell = (drift: DriftAmount): StatementAmountCell => ({
  amountText: formatDriftAmountText(drift),
  amountWarning: isDrifted(drift),
});

/** Inline variant of the amount cell for totals rendered inside prose. */
const StatementAmountText: React.FC<{ drift: DriftAmount }> = ({ drift }) => (
  <span className={cn(isDrifted(drift) && 'text-warning')}>{formatDriftAmountText(drift)}</span>
);

const totalLabel = (section: string): string => `${section}${MONTHLY_CLOSE_LABELS.TOTAL_SUFFIX}`;

/** 一條漂移明細列，含巢狀 `subItems`（縮排層級與角色由共用 builder 依層級決定）。 */
const driftNode = (item: DriftItem): StatementNode => ({
  code: item.code,
  label: item.label,
  cell: driftCell(item),
  subItems: item.subItems?.length ? item.subItems.map(driftNode) : undefined,
});

const driftSection = (
  key: string,
  label: string,
  total: DriftAmount,
  nodes: StatementNode[],
): StatementSectionSource => ({
  key,
  label,
  totalLabel: totalLabel(label),
  cell: driftCell(total),
  nodes,
});

/** 總額非 0 或有明細才顯示該區塊（「無資料」判斷）。 */
const included = (total: DriftAmount, count: number): boolean => total.amount !== 0 || count > 0;

interface StatementViewProps {
  collapsed: ReadonlySet<string>;
  onToggle: (key: string) => void;
}

export const IncomeStatementView: React.FC<
  StatementViewProps & { data: IncomeStatementDrift | null }
> = ({ data, collapsed, onToggle }) => {
  if (!data) return null;

  const sections = [
    included(data.incomeTotal, data.incomeItems.length)
      ? driftSection(
          'income',
          MONTHLY_CLOSE_LABELS.INCOME_SECTION,
          data.incomeTotal,
          data.incomeItems.map(driftNode),
        )
      : null,
    included(data.expenseTotal, data.expenseItems.length)
      ? driftSection(
          'expense',
          MONTHLY_CLOSE_LABELS.EXPENSE_SECTION,
          data.expenseTotal,
          data.expenseItems.map(driftNode),
        )
      : null,
  ].filter((section): section is StatementSectionSource => section !== null);

  const rows = buildStatementRows({
    sections,
    terminus: { label: MONTHLY_CLOSE_LABELS.NET_INCOME, cell: driftCell(data.netIncome) },
  });

  return (
    <div data-testid="close-income-statement">
      <StatementTable
        testId="income-statement-table"
        rows={rows}
        collapsed={collapsed}
        onToggle={onToggle}
      />
    </div>
  );
};

const balanceGroupNode = (key: string, group: DriftGroup): StatementNode => ({
  code: key,
  label: group.label,
  cell: driftCell(group.total),
  subItems: group.items.map(driftNode),
});

/** 一個資產負債表區塊：標題列 + 群組列 + 合計列（空區塊回傳 null）。 */
const balanceSection = (
  key: string,
  label: string,
  side: { total: DriftAmount; groups: Record<string, DriftGroup> },
  filtered: boolean,
): StatementSectionSource | null => {
  const entries = Object.entries(side.groups).filter(
    ([, group]) => !filtered || included(group.total, group.items.length),
  );
  if (!included(side.total, entries.length)) return null;
  return driftSection(
    key,
    label,
    side.total,
    entries.map(([groupKey, group]) => balanceGroupNode(groupKey, group)),
  );
};

const balanceSheetRows = (data: BalanceSheetDrift): StatementRow[] => {
  const sections = [
    balanceSection('assets', MONTHLY_CLOSE_LABELS.ASSETS_SECTION, data.assets, true),
    balanceSection('liabilities', MONTHLY_CLOSE_LABELS.LIABILITIES_SECTION, data.liabilities, true),
    // 權益的五個來源是固定拆分，即使為零也顯示，不讓歸零的來源被默默省略。
    balanceSection('equity', MONTHLY_CLOSE_LABELS.EQUITY_SECTION, data.equity, false),
  ].filter((section): section is StatementSectionSource => section !== null);

  return buildStatementRows({
    sections,
    terminus: {
      label: MONTHLY_CLOSE_LABELS.LIABILITIES_PLUS_EQUITY,
      cell: driftCell(combineDrift([data.liabilities.total, data.equity.total])),
    },
  });
};

export const BalanceSheetView: React.FC<
  StatementViewProps & { data: BalanceSheetDrift | null }
> = ({ data, collapsed, onToggle }) => {
  if (!data) return null;
  return (
    <div data-testid="close-balance-sheet">
      <StatementTable
        testId="balance-sheet-table"
        rows={balanceSheetRows(data)}
        collapsed={collapsed}
        onToggle={onToggle}
      />
    </div>
  );
};

// 流入與流出桶可能共用科目代碼，路徑式 key（由共用 builder 組出）讓桶彼此隔離。
const cashFlowBucketNode = (
  bucket: 'inflow' | 'outflow',
  label: string,
  items: DriftItem[],
): StatementNode | null => {
  if (items.length === 0) return null;
  return {
    code: bucket,
    label,
    cell: driftCell(combineDrift(items)),
    subItems: items.map(driftNode),
  };
};

export const CashFlowView: React.FC<StatementViewProps & { data: CashFlowDrift | null }> = ({
  data,
  collapsed,
  onToggle,
}) => {
  if (!data) return null;
  const sections = (['operating', 'investing', 'financing'] as const)
    .map((key) => {
      const group = data[key];
      const nodes = [
        cashFlowBucketNode('inflow', MONTHLY_CLOSE_LABELS.INFLOW, group.inflowItems),
        cashFlowBucketNode('outflow', MONTHLY_CLOSE_LABELS.OUTFLOW, group.outflowItems),
      ].filter((node): node is StatementNode => node !== null);
      return included(group.total, nodes.length)
        ? driftSection(key, group.label, group.total, nodes)
        : null;
    })
    .filter((section): section is StatementSectionSource => section !== null);

  const rows = buildStatementRows({
    sections,
    terminus: {
      label: MONTHLY_CLOSE_LABELS.NET_CASH_CHANGE,
      cell: driftCell(data.netCashChange),
    },
  });

  return (
    <div className="space-y-6" data-testid="close-cash-flow">
      <StatementTable
        testId="cash-flow-table"
        rows={rows}
        collapsed={collapsed}
        onToggle={onToggle}
      />
      <p className="text-right text-xs text-muted-foreground">
        {MONTHLY_CLOSE_LABELS.ACTUAL_BALANCE} <StatementAmountText drift={data.actualBalance} />
      </p>
    </div>
  );
};
