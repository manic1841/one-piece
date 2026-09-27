import React, { useState } from 'react';

import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableScrollArea,
  NumberCell,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { formatCurrency } from '@/ui/utils';

import {
  type BalanceSheetData,
  type BalanceSheetGroup,
  type CashFlowData,
  type IncomeStatementData,
} from '../hooks/useCloseFinancialReports';

const STATEMENT_COLUMN_WIDTHS = [22, 14, 64] as const;

export const statementTitleClass =
  'text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground';

interface StatementRowItem {
  code: string;
  label: string;
  amount: number;
  subItems?: StatementRowItem[];
}

const StatementRows: React.FC<{ items: StatementRowItem[] }> = ({ items }) => (
  <>
    {items.map((item) => (
      <StatementRow key={item.code} item={item} />
    ))}
  </>
);

const StatementRow: React.FC<{ item: StatementRowItem }> = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState(
    item.subItems !== undefined && item.subItems.length > 0,
  );
  const hasSubItems = item.subItems !== undefined && item.subItems.length > 0;

  return (
    <>
      <DataTableRow
        interactive={hasSubItems}
        onClick={() => hasSubItems && setIsExpanded(!isExpanded)}
      >
        <DataTableCell>
          <span className={hasSubItems ? 'font-medium text-foreground' : 'text-muted-foreground'}>
            {item.label}
          </span>
        </DataTableCell>
        <NumberCell value={item.amount} format={formatCurrency} />
        <DataTableCell className="text-xs text-muted-foreground">
          {hasSubItems ? (isExpanded ? '−' : '+') : ''}
        </DataTableCell>
      </DataTableRow>
      {isExpanded && hasSubItems && <StatementRows items={item.subItems!} />}
    </>
  );
};

const StatementTable: React.FC<{ items: StatementRowItem[] }> = ({ items }) => (
  <DataTableScrollArea>
    <DataTable>
      <DataTableColGroup widths={STATEMENT_COLUMN_WIDTHS} />
      <TableHeader>
        <DataTableHeadRow>
          <DataTableHeadCell>{MONTHLY_CLOSE_LABELS.STATEMENT_ITEM}</DataTableHeadCell>
          <DataTableHeadCell align="number">
            {MONTHLY_CLOSE_LABELS.STATEMENT_AMOUNT}
          </DataTableHeadCell>
          <DataTableHeadCell>{''}</DataTableHeadCell>
        </DataTableHeadRow>
      </TableHeader>
      <TableBody>
        <StatementRows items={items} />
      </TableBody>
    </DataTable>
  </DataTableScrollArea>
);

export const IncomeStatementView: React.FC<{ data: IncomeStatementData | null }> = ({ data }) => {
  if (!data) return null;
  return (
    <div className="space-y-6" data-testid="close-income-statement">
      <div className="flex items-baseline justify-between">
        <p className={statementTitleClass}>{MONTHLY_CLOSE_LABELS.INCOME_SECTION}</p>
        <p className="text-sm text-muted-foreground">
          {MONTHLY_CLOSE_LABELS.INCOME_TOTAL} {formatCurrency(data.incomeTotal)}
        </p>
      </div>
      <StatementTable items={data.incomeItems} />
      <div className="flex items-baseline justify-between">
        <p className={statementTitleClass}>{MONTHLY_CLOSE_LABELS.EXPENSE_SECTION}</p>
        <p className="text-sm text-muted-foreground">
          {MONTHLY_CLOSE_LABELS.EXPENSE_TOTAL} {formatCurrency(data.expenseTotal)}
        </p>
      </div>
      <StatementTable items={data.expenseItems} />
      <div className="flex items-baseline justify-end gap-4 border-t border-border pt-4">
        <p className="text-sm font-semibold text-foreground">
          {MONTHLY_CLOSE_LABELS.NET_INCOME} {formatCurrency(data.netIncome)}
        </p>
      </div>
    </div>
  );
};

export const BalanceGroupSection: React.FC<{ group: BalanceSheetGroup; calculated?: boolean }> = ({
  group,
  calculated = false,
}) => {
  if (group.total === 0 && group.items.length === 0 && !calculated) return null;
  return (
    <section
      className="space-y-3 border-b border-border pb-4 last:border-b-0"
      data-testid="close-balance-group"
    >
      <div className="flex items-baseline justify-between">
        <p className={statementTitleClass}>{group.label}</p>
        <p className="font-mono text-sm tabular-nums text-foreground">
          {formatCurrency(group.total)}
          {calculated && (
            <span className="ml-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {MONTHLY_CLOSE_LABELS.CALCULATED}
            </span>
          )}
        </p>
      </div>
      {group.items.length > 0 && <StatementTable items={group.items} />}
    </section>
  );
};

export const BalanceSheetView: React.FC<{ data: BalanceSheetData | null }> = ({ data }) => {
  if (!data) return null;
  const equityEntries = Object.entries(data.equity.groups);
  return (
    <div className="space-y-6" data-testid="close-balance-sheet">
      <p className={statementTitleClass}>{MONTHLY_CLOSE_LABELS.ASSETS_SECTION}</p>
      {Object.values(data.assets.groups).map((group) => (
        <BalanceGroupSection key={group.label} group={group} />
      ))}
      <p className={statementTitleClass}>{MONTHLY_CLOSE_LABELS.LIABILITIES_SECTION}</p>
      {Object.values(data.liabilities.groups).map((group) => (
        <BalanceGroupSection key={group.label} group={group} />
      ))}
      <p className={statementTitleClass}>{MONTHLY_CLOSE_LABELS.EQUITY_SECTION}</p>
      {equityEntries.map(([key, group]) => (
        <BalanceGroupSection
          key={key}
          group={group}
          calculated={key === 'netIncome' || key === 'adjustment'}
        />
      ))}
    </div>
  );
};

export const CashFlowView: React.FC<{ data: CashFlowData | null }> = ({ data }) => {
  if (!data) return null;
  const groups = [
    { key: 'operating', group: data.operating },
    { key: 'investing', group: data.investing },
    { key: 'financing', group: data.financing },
  ];
  return (
    <div className="space-y-6" data-testid="close-cash-flow">
      {groups.map(({ key, group }) => {
        if (group.total === 0 && group.inflowItems.length === 0 && group.outflowItems.length === 0)
          return null;
        return (
          <section key={key} className="space-y-3" data-testid="close-cash-group">
            <p className={statementTitleClass}>{group.label}</p>
            <StatementTable items={[...group.inflowItems, ...group.outflowItems]} />
          </section>
        );
      })}
      <div className="flex items-baseline justify-end gap-4 border-t border-border pt-4">
        <p className="text-sm font-semibold text-foreground">
          {MONTHLY_CLOSE_LABELS.NET_CASH_CHANGE} {formatCurrency(data.netCashChange)}
        </p>
        <p className="text-sm text-muted-foreground">
          {MONTHLY_CLOSE_LABELS.ACTUAL_BALANCE} {formatCurrency(data.actualBalance)}
        </p>
      </div>
    </div>
  );
};
