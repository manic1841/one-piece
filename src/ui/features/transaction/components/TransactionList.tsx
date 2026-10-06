import React from 'react';

import { ArrowRight, Plus } from 'lucide-react';

import { EmptyState } from '@/ui/components/EmptyState';
import { Skeleton } from '@/ui/components/Skeleton';
import {
  DataTable,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableScrollArea,
  MobileDataList,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { TRANSACTION_COUNT_SUFFIX } from '@/ui/constants/transaction/displayLabels';
import {
  TRANSACTIONS_PAGE_CREATE_ACTION,
  TRANSACTIONS_PAGE_EMPTY_DESCRIPTION,
  TRANSACTIONS_PAGE_EMPTY_TITLE,
  TRANSACTIONS_PAGE_LOADING_LABEL,
  TRANSACTIONS_PAGE_RETRY_ACTION,
} from '@/ui/constants/transaction/transactionsPageLabels';
import { type TransactionListItemVM } from '@/ui/features/transaction/viewmodels/transaction-list.vm';

import { TransactionItem, TransactionItemMobile } from './TransactionItem';

interface TransactionListProps {
  items: TransactionListItemVM[];
  loading: boolean;
  /** 有值時整塊清單改以錯誤呈現，不顯示過期資料。 */
  error?: string | null;
  /** 覆寫空狀態文案（例如篩選無結果）。 */
  emptyState?: { title: string; description: string };
  onRetry?: () => void;
  onCreate?: () => void;
  onEdit?: (transaction: TransactionListItemVM) => void;
  onDelete?: (transaction: TransactionListItemVM) => void;
}

/** 桌面欄寬：日期 12%、交易 38%、專案 20%、金額 22%、動作 8%（總和 100）。 */
const DESKTOP_COLUMN_WIDTHS = [12, 38, 20, 22, 8] as const;

const SKELETON_ROWS = [0, 1, 2, 3, 4];

export const TransactionList: React.FC<TransactionListProps> = ({
  items,
  loading,
  error,
  emptyState,
  onRetry,
  onCreate,
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
    return (
      <div role="status" className="space-y-2 py-2">
        <span className="sr-only">{TRANSACTIONS_PAGE_LOADING_LABEL}</span>
        {SKELETON_ROWS.map((row) => (
          <Skeleton key={row} className="h-12" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="warning">
        <AlertDescription>{error}</AlertDescription>
        {onRetry && (
          <Button variant="text" className="ml-auto shrink-0" onClick={onRetry}>
            {TRANSACTIONS_PAGE_RETRY_ACTION}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        )}
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyState?.title ?? TRANSACTIONS_PAGE_EMPTY_TITLE}
        description={emptyState?.description ?? TRANSACTIONS_PAGE_EMPTY_DESCRIPTION}
        action={
          onCreate ? (
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4" />
              {TRANSACTIONS_PAGE_CREATE_ACTION}
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-8">
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
          <MobileDataList>
            {transactions.map((item) => (
              <TransactionItemMobile
                key={item.id}
                transaction={item}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </MobileDataList>
          <DataTableScrollArea>
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
          </DataTableScrollArea>
        </section>
      ))}
    </div>
  );
};
