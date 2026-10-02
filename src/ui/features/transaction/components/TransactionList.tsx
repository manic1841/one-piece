import React from 'react';

import {
  DataTable,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import {
  NO_DATA_DESCRIPTION,
  NO_DATA_STATUS_LABEL,
  TRANSACTION_COUNT_SUFFIX,
} from '@/ui/constants/transaction/displayLabels';
import { type TransactionListItemVM } from '@/ui/features/transaction/viewmodels/transaction-list.vm';

import { TransactionItem, TransactionItemMobile } from './TransactionItem';

interface TransactionListProps {
  items: TransactionListItemVM[];
  loading: boolean;
  onEdit?: (transaction: TransactionListItemVM) => void;
  onDelete?: (transaction: TransactionListItemVM) => void;
}

/** 桌面欄寬：日期 12%、交易 38%、專案 20%、金額 22%、動作 8%（總和 100）。 */
const DESKTOP_COLUMN_WIDTHS = [12, 38, 20, 22, 8] as const;

const SkeletonList: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-2 py-2" aria-hidden="true">
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="h-12 animate-pulse rounded-sm bg-muted" />
    ))}
  </div>
);

export const TransactionList: React.FC<TransactionListProps> = ({
  items,
  loading,
  onDelete,
  onEdit,
}) => {
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, TransactionListItemVM[]> = {};

    items.forEach((item) => {
      const key = item.monthKey;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => b.sortTimestamp - a.sortTimestamp);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  if (loading) {
    return <SkeletonList />;
  }

  return (
    <div className="space-y-8">
      {items.length === 0 ? (
        <div className="flex flex-col items-start gap-2 py-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {NO_DATA_STATUS_LABEL}
          </span>
          <p className="text-sm text-muted-foreground">{NO_DATA_DESCRIPTION}</p>
        </div>
      ) : null}

      {groupedItems.map(([month, transactions]) => (
        <section key={month} className="relative">
          <div className="mb-1 flex items-baseline justify-between border-b border-border pb-2">
            <h3 className="text-sm font-semibold tracking-heading text-foreground">
              {transactions[0]?.monthHeaderText ?? month}
            </h3>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {transactions.length} {TRANSACTION_COUNT_SUFFIX}
            </span>
          </div>
          <div className="md:hidden">
            {transactions.map((item) => (
              <TransactionItemMobile
                key={item.id}
                transaction={item}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
          <div className="hidden md:block">
            <DataTable>
              <DataTableColGroup widths={DESKTOP_COLUMN_WIDTHS} />
              <TableHeader>
                <DataTableHeadRow>
                  <DataTableHeadCell>日期</DataTableHeadCell>
                  <DataTableHeadCell>交易</DataTableHeadCell>
                  <DataTableHeadCell>專案</DataTableHeadCell>
                  <DataTableHeadCell align="number">金額</DataTableHeadCell>
                  <DataTableHeadCell>
                    <span className="sr-only">動作</span>
                  </DataTableHeadCell>
                </DataTableHeadRow>
              </TableHeader>
              <TableBody>
                {transactions.map((item) => (
                  <TransactionItem
                    key={item.id}
                    transaction={item}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </TableBody>
            </DataTable>
          </div>
        </section>
      ))}
    </div>
  );
};
