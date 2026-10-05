import React from 'react';

import { type StatementRow, StatementTable } from '@/ui/components/statement/StatementTable';
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

export const statementTitleClass =
  'text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground';

/** 漂移金額 → 共用列的金額欄位：文字為 delta 或原值，警示色標記已漂移。 */
const amountCell = (drift: DriftAmount): Pick<StatementRow, 'amountText' | 'amountWarning'> => ({
  amountText: formatDriftAmountText(drift),
  amountWarning: isDrifted(drift),
});

/** Inline variant of the amount cell for totals rendered inside prose. */
const StatementAmountText: React.FC<{ drift: DriftAmount }> = ({ drift }) => (
  <span className={cn(isDrifted(drift) && 'text-warning')}>{formatDriftAmountText(drift)}</span>
);

const totalRow = (key: string, label: string, amount: DriftAmount): StatementRow => ({
  key,
  label: `${label}${MONTHLY_CLOSE_LABELS.TOTAL_SUFFIX}`,
  ...amountCell(amount),
  tone: 'subtotal',
  level: 0,
  children: [],
});

const terminusRow = (key: string, label: string, amount: DriftAmount): StatementRow => ({
  key,
  label,
  ...amountCell(amount),
  tone: 'terminus',
  level: 0,
  children: [],
});

/**
 * The semantic role of a data row, keyed by its level in the report hierarchy:
 * first-level data is a Group, its `subItems` are Detail, and everything below
 * is Deep detail (visual-standards 「財務報表語意階層」). The role comes from the
 * table, so the same level looks the same in all three statements.
 */
const LEVEL_TONES: readonly StatementRow['tone'][] = ['group', 'detail', 'deepDetail'];

const toneForLevel = (level: number): StatementRow['tone'] =>
  LEVEL_TONES[level - 1] ?? 'deepDetail';

const itemRows = (items: DriftItem[], level: number, keyPrefix = ''): StatementRow[] =>
  items.map((item) => ({
    key: `${keyPrefix}${item.code}`,
    label: item.label,
    ...amountCell(item),
    tone: toneForLevel(level),
    level,
    children: item.subItems?.length ? itemRows(item.subItems, level + 1, keyPrefix) : [],
  }));

interface StatementViewProps {
  collapsed: ReadonlySet<string>;
  onToggle: (key: string) => void;
}

export const IncomeStatementView: React.FC<
  StatementViewProps & { data: IncomeStatementDrift | null }
> = ({ data, collapsed, onToggle }) => {
  if (!data) return null;
  const showIncome = data.incomeTotal.amount !== 0 || data.incomeItems.length > 0;
  const showExpense = data.expenseTotal.amount !== 0 || data.expenseItems.length > 0;

  const rows: StatementRow[] = [];
  if (showIncome) {
    rows.push({
      key: 'section:income',
      label: MONTHLY_CLOSE_LABELS.INCOME_SECTION,
      amountText: null,
      tone: 'section',
      level: 0,
      children: itemRows(data.incomeItems, 1),
    });
    rows.push(totalRow('total:income', MONTHLY_CLOSE_LABELS.INCOME_SECTION, data.incomeTotal));
  }
  if (showExpense) {
    rows.push({
      key: 'section:expense',
      label: MONTHLY_CLOSE_LABELS.EXPENSE_SECTION,
      amountText: null,
      tone: 'section',
      level: 0,
      children: itemRows(data.expenseItems, 1),
    });
    rows.push(totalRow('total:expense', MONTHLY_CLOSE_LABELS.EXPENSE_SECTION, data.expenseTotal));
  }
  rows.push(terminusRow('terminus:netIncome', MONTHLY_CLOSE_LABELS.NET_INCOME, data.netIncome));

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

const balanceGroupRow = (key: string, group: DriftGroup): StatementRow => ({
  key,
  label: group.label,
  ...amountCell(group.total),
  tone: 'group',
  level: 1,
  children: itemRows(group.items, 2),
});

/** A balance-sheet section: header row, its groups, then the section total row. */
const balanceSection = (
  key: string,
  label: string,
  total: DriftAmount,
  groups: [string, DriftGroup][],
): StatementRow[] => [
  {
    key: `section:${key}`,
    label,
    amountText: null,
    tone: 'section',
    level: 0,
    children: groups.map(([groupKey, group]) => balanceGroupRow(`${key}:${groupKey}`, group)),
  },
  totalRow(`total:${key}`, label, total),
];

const hasBalanceEntries = (group: DriftGroup): boolean =>
  group.total.amount !== 0 || group.items.length > 0;

const balanceSheetRows = (data: BalanceSheetDrift): StatementRow[] => {
  const rows: StatementRow[] = [];

  const assetGroups = Object.entries(data.assets.groups).filter(([, group]) =>
    hasBalanceEntries(group),
  );
  if (data.assets.total.amount !== 0 || assetGroups.length > 0) {
    rows.push(
      ...balanceSection(
        'assets',
        MONTHLY_CLOSE_LABELS.ASSETS_SECTION,
        data.assets.total,
        assetGroups,
      ),
    );
  }

  const liabilityGroups = Object.entries(data.liabilities.groups).filter(([, group]) =>
    hasBalanceEntries(group),
  );
  if (data.liabilities.total.amount !== 0 || liabilityGroups.length > 0) {
    rows.push(
      ...balanceSection(
        'liabilities',
        MONTHLY_CLOSE_LABELS.LIABILITIES_SECTION,
        data.liabilities.total,
        liabilityGroups,
      ),
    );
  }

  // The five equity sources are a fixed breakdown — always shown, even at zero,
  // so a zeroed source is not silently dropped from the statement.
  const equityGroups = Object.entries(data.equity.groups);
  if (data.equity.total.amount !== 0 || equityGroups.length > 0) {
    rows.push(
      ...balanceSection(
        'equity',
        MONTHLY_CLOSE_LABELS.EQUITY_SECTION,
        data.equity.total,
        equityGroups,
      ),
    );
  }

  rows.push(
    terminusRow(
      'terminus:liabilitiesPlusEquity',
      MONTHLY_CLOSE_LABELS.LIABILITIES_PLUS_EQUITY,
      combineDrift([data.liabilities.total, data.equity.total]),
    ),
  );

  return rows;
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

// Inflow and outflow buckets legitimately share codes (a same-month buy+sell
// or capital in+out), so their flattened rows need bucket-scoped keys or the
// duplicate React keys render ghost rows on collapse/expand.
const cashFlowGroupRow = (
  key: string,
  label: string,
  items: DriftItem[],
  keyPrefix: string,
): StatementRow | null => {
  if (items.length === 0) return null;
  return {
    key,
    label,
    ...amountCell(combineDrift(items)),
    tone: 'group',
    level: 1,
    children: itemRows(items, 2, keyPrefix),
  };
};

export const CashFlowView: React.FC<StatementViewProps & { data: CashFlowDrift | null }> = ({
  data,
  collapsed,
  onToggle,
}) => {
  if (!data) return null;
  const groups = [
    { key: 'operating', group: data.operating },
    { key: 'investing', group: data.investing },
    { key: 'financing', group: data.financing },
  ];

  const rows: StatementRow[] = [];
  for (const { key, group } of groups) {
    const hasItems = group.inflowItems.length > 0 || group.outflowItems.length > 0;
    if (group.total.amount === 0 && !hasItems) continue;
    const children = [
      cashFlowGroupRow(`${key}:inflow`, MONTHLY_CLOSE_LABELS.INFLOW, group.inflowItems, 'inflow:'),
      cashFlowGroupRow(
        `${key}:outflow`,
        MONTHLY_CLOSE_LABELS.OUTFLOW,
        group.outflowItems,
        'outflow:',
      ),
    ].filter((row): row is StatementRow => row !== null);
    rows.push({
      key: `section:${key}`,
      label: group.label,
      amountText: null,
      tone: 'section',
      level: 0,
      children,
    });
    rows.push(totalRow(`total:${key}`, group.label, group.total));
  }
  rows.push(
    terminusRow('terminus:netCashChange', MONTHLY_CLOSE_LABELS.NET_CASH_CHANGE, data.netCashChange),
  );

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
