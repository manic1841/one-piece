import React from 'react';

import { ChevronRight } from 'lucide-react';

import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableRow,
  NumberCell,
  TableBody,
} from '@/ui/components/data-table';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { cn, formatCurrency } from '@/ui/utils';

import {
  type BalanceSheetDrift,
  type CashFlowDrift,
  type DriftAmount,
  type DriftGroup,
  type DriftItem,
  type IncomeStatementDrift,
  combineDrift,
  formatDriftDelta,
  isDrifted,
} from '../../../viewmodels/reportDrift.vm';

export const statementTitleClass =
  'text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground';

/** Two columns: the label (chevron + indented text) and the rightmost amount. */
const STATEMENT_COLUMN_WIDTHS = [74, 26] as const;

/**
 * Indentation per hierarchy level (design-system 間距級距): one step per level,
 * never an inline pixel calculation.
 */
const INDENT_CLASS: readonly string[] = ['', 'pl-4', 'pl-8', 'pl-12'];

const indentClass = (level: number): string => INDENT_CLASS[level] ?? 'pl-12';

/**
 * A statement row in display order. Sections (the top-level groups that stand in
 * for the table header) carry no amount of their own — a dedicated total row
 * follows. Rows with children are collapsible with a chevron on the left.
 *
 * The tone is a semantic role (see `Financial Statement Semantic Hierarchy` in
 * `docs/ui/visual-standards.md`), assigned from the row's level by
 * {@link toneForLevel} — never inferred from how far the label is indented. The
 * same role looks the same in every statement.
 */
type RowTone = 'section' | 'group' | 'detail' | 'deepDetail' | 'subtotal' | 'terminus';

interface StatementRow {
  key: string;
  label: string;
  amount: DriftAmount | null;
  tone: RowTone;
  /** The row's level in the report hierarchy (1 = first-level data). */
  level: number;
  children: StatementRow[];
}

/** A drifted amount cell: the `<persisted> -> <preview>` text in the warning colour. */
const StatementAmountCell: React.FC<{ drift: DriftAmount; tone: RowTone }> = ({ drift, tone }) => {
  const className = AMOUNT_TONE_CLASS[tone];
  const delta = formatDriftDelta(drift);
  if (delta === null) {
    return (
      <NumberCell
        value={drift.amount}
        format={formatCurrency}
        className={cn(className, isDrifted(drift) && 'text-warning')}
      />
    );
  }
  return (
    <DataTableCell align="number" className={cn(className, 'text-warning')}>
      {delta}
    </DataTableCell>
  );
};

/** Inline variant of {@link StatementAmountCell} for totals rendered inside prose. */
const StatementAmountText: React.FC<{ drift: DriftAmount }> = ({ drift }) => (
  <span className={cn(isDrifted(drift) && 'text-warning')}>
    {formatDriftDelta(drift) ?? formatCurrency(drift.amount)}
  </span>
);

const RowAmountCell: React.FC<{ value: DriftAmount | null; tone: RowTone }> = ({ value, tone }) => {
  if (value === null) return <DataTableCell align="number" />;
  return <StatementAmountCell drift={value} tone={tone} />;
};

const LABEL_TONE_CLASS: Record<RowTone, string> = {
  section: 'text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground',
  group: 'text-[13px] font-medium text-foreground',
  detail: 'text-xs text-muted-foreground',
  deepDetail: 'text-[11px] text-muted-foreground',
  subtotal: 'text-[13px] font-semibold text-foreground',
  terminus: 'text-base font-semibold text-foreground',
};

const AMOUNT_TONE_CLASS: Record<RowTone, string> = {
  section: '',
  group: 'text-[13px]',
  detail: 'text-xs',
  deepDetail: 'text-[11px]',
  subtotal: 'text-[13px] font-semibold',
  terminus: 'text-base font-semibold',
};

const ROW_TONE_CLASS: Record<RowTone, string> = {
  section: 'border-b border-border bg-muted/40',
  group: '',
  detail: '',
  deepDetail: '',
  subtotal: 'border-t border-border-strong',
  terminus: 'h-16 border-t-2 border-foreground bg-muted/40',
};

const totalRow = (key: string, label: string, amount: DriftAmount): StatementRow => ({
  key,
  label: `${label}${MONTHLY_CLOSE_LABELS.TOTAL_SUFFIX}`,
  amount,
  tone: 'subtotal',
  level: 0,
  children: [],
});

const terminusRow = (key: string, label: string, amount: DriftAmount): StatementRow => ({
  key,
  label,
  amount,
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
const LEVEL_TONES: readonly RowTone[] = ['group', 'detail', 'deepDetail'];

const toneForLevel = (level: number): RowTone => LEVEL_TONES[level - 1] ?? 'deepDetail';

const itemRows = (items: DriftItem[], level: number, keyPrefix = ''): StatementRow[] =>
  items.map((item) => ({
    key: `${keyPrefix}${item.code}`,
    label: item.label,
    amount: item,
    tone: toneForLevel(level),
    level,
    children: item.subItems?.length ? itemRows(item.subItems, level + 1, keyPrefix) : [],
  }));

const flattenRows = (
  rows: StatementRow[],
  collapsed: ReadonlySet<string>,
  out: StatementRow[] = [],
): StatementRow[] => {
  for (const row of rows) {
    out.push(row);
    if (row.children.length > 0 && !collapsed.has(row.key)) {
      flattenRows(row.children, collapsed, out);
    }
  }
  return out;
};

const StatementRowView: React.FC<{
  row: StatementRow;
  collapsed: ReadonlySet<string>;
  onToggle: (key: string) => void;
}> = ({ row, collapsed, onToggle }) => {
  const hasChildren = row.children.length > 0;
  const isCollapsed = hasChildren && collapsed.has(row.key);

  return (
    <DataTableRow className={ROW_TONE_CLASS[row.tone]}>
      <DataTableCell>
        <div className={cn('flex items-center gap-1', indentClass(row.level))}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggle(row.key)}
              aria-expanded={!isCollapsed}
              aria-label={row.label}
              className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground"
            >
              <ChevronRight
                className={cn('h-3.5 w-3.5 transition-transform', !isCollapsed && 'rotate-90')}
              />
            </button>
          ) : (
            <span className="h-5 w-5 shrink-0" aria-hidden />
          )}
          <span className={LABEL_TONE_CLASS[row.tone]}>{row.label}</span>
        </div>
      </DataTableCell>
      <RowAmountCell value={row.amount} tone={row.tone} />
    </DataTableRow>
  );
};

const StatementTable: React.FC<{
  rows: StatementRow[];
  collapsed: ReadonlySet<string>;
  onToggle: (key: string) => void;
  testId: string;
}> = ({ rows, collapsed, onToggle, testId }) => (
  <DataTable data-testid={testId}>
    <DataTableColGroup widths={STATEMENT_COLUMN_WIDTHS} />
    <TableBody>
      {flattenRows(rows, collapsed).map((row) => (
        <StatementRowView key={row.key} row={row} collapsed={collapsed} onToggle={onToggle} />
      ))}
    </TableBody>
  </DataTable>
);

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
      amount: null,
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
      amount: null,
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
  amount: group.total,
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
    amount: null,
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
    amount: combineDrift(items),
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
      amount: null,
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
