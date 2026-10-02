import React, { useState } from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/components/ui/table';
import {
  ACCOUNTING_DETAILS_ENTRY_LABEL,
  ACCOUNTING_DETAILS_SECTION_LABEL,
  NO_CASH_ENTRY_LABEL,
  TRACKING_LABEL,
} from '@/ui/constants/transaction/displayLabels';
import { type TransactionListItemVM } from '@/ui/features/transaction/viewmodels/transaction-list.vm';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

// Must match TransactionList's desktop column count: the accordion spans all of them.
const ACCORDION_ROW_COL_SPAN = 5;

function AccountingDetailsTable({ transaction }: { transaction: TransactionListItemVM }) {
  const detailEntries = transaction.entries ?? [];

  return (
    <div className="px-3 pb-4 pt-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {ACCOUNTING_DETAILS_SECTION_LABEL}
      </p>
      <Table className="mt-2">
        <TableHeader>
          <TableRow>
            <TableHead>{ACCOUNTING_DETAILS_ENTRY_LABEL}</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {detailEntries.map((entry, index) => (
            <TableRow key={`${entry.ledgerCode}-${index}`}>
              <TableCell className="font-mono text-[12px]">{entry.ledgerLabel}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {entry.debit > 0 ? formatAmount(entry.debit) : '—'}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {entry.credit > 0 ? formatAmount(entry.credit) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface TransactionItemProps {
  transaction: TransactionListItemVM;
  onEdit?: (transaction: TransactionListItemVM) => void;
  onDelete?: (transaction: TransactionListItemVM) => void;
}

function RowActions({
  transaction,
  onEdit,
  onDelete,
}: {
  transaction: TransactionListItemVM;
  onEdit?: (transaction: TransactionListItemVM) => void;
  onDelete?: (transaction: TransactionListItemVM) => void;
}) {
  return (
    <>
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(transaction)}
          aria-label="編輯交易"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
        >
          <Pencil size={15} />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(transaction)}
          aria-label="刪除交易"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={15} />
        </Button>
      )}
    </>
  );
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onEdit,
  onDelete,
}) => {
  const {
    displayTitle,
    projectName,
    categoryLabel,
    dateText,
    hasCashLedger,
    isPositive,
    signedAmountText,
  } = transaction;
  const amountColor = isPositive ? 'text-positive' : 'text-negative';
  const [isExpanded, setIsExpanded] = useState(false);
  const hasEntries = (transaction.entries ?? []).length > 0;

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setIsExpanded((prev) => !prev);
  };

  return (
    <>
      <TableRow
        data-testid={`transaction-row-${transaction.id}`}
        className={cn('align-top group', isExpanded && 'border-b-0 bg-muted/50')}
        interactive={hasEntries}
        aria-expanded={hasEntries ? isExpanded : undefined}
        tabIndex={hasEntries ? 0 : undefined}
        onClick={hasEntries ? () => setIsExpanded((prev) => !prev) : undefined}
        onKeyDown={hasEntries ? handleRowKeyDown : undefined}
      >
        <TableCell className="font-mono text-[12px] tabular-nums whitespace-nowrap">
          {dateText}
        </TableCell>
        <TableCell>
          <span className="block font-medium">{displayTitle}</span>
          <span className="text-[11px] text-muted-foreground">{categoryLabel}</span>
        </TableCell>
        <TableCell className="text-muted-foreground">{projectName ?? '—'}</TableCell>
        <TableCell
          className={cn(
            'text-right font-mono tabular-nums whitespace-nowrap',
            hasCashLedger ? amountColor : 'text-warning',
          )}
        >
          {signedAmountText}
          {!hasCashLedger && (
            <span className={cn('block font-bold uppercase', TRACKING_LABEL)}>
              {NO_CASH_ENTRY_LABEL}
            </span>
          )}
        </TableCell>
        <TableCell>
          <span className="flex justify-end gap-1 opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100">
            <RowActions transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
          </span>
        </TableCell>
      </TableRow>
      {hasEntries && isExpanded ? (
        <TableRow
          className="hover:bg-transparent"
          data-testid={`transaction-details-${transaction.id}`}
        >
          <TableCell colSpan={ACCORDION_ROW_COL_SPAN} className="p-0">
            <AccountingDetailsTable transaction={transaction} />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
};

export const TransactionItemMobile: React.FC<TransactionItemProps> = ({
  transaction,
  onEdit,
  onDelete,
}) => {
  const {
    displayTitle,
    projectName,
    categoryLabel,
    dateText,
    hasCashLedger,
    isPositive,
    signedAmountText,
  } = transaction;
  const amountColor = isPositive ? 'text-positive' : 'text-negative';
  const [isExpanded, setIsExpanded] = useState(false);
  const hasEntries = (transaction.entries ?? []).length > 0;

  return (
    <div
      data-testid={`transaction-row-mobile-${transaction.id}`}
      role={hasEntries ? 'button' : undefined}
      tabIndex={hasEntries ? 0 : undefined}
      aria-expanded={hasEntries ? isExpanded : undefined}
      onClick={hasEntries ? () => setIsExpanded((prev) => !prev) : undefined}
      onKeyDown={(event) => {
        if (!hasEntries) return;
        if (event.target !== event.currentTarget) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        setIsExpanded((prev) => !prev);
      }}
      className={cn(
        'border-b border-border py-3 md:hidden',
        hasEntries &&
          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground whitespace-nowrap">
            {dateText}
          </span>
          <span className="min-w-0 truncate text-sm font-medium">{displayTitle}</span>
        </span>
        <span
          className={cn(
            'ml-auto font-mono text-sm tabular-nums whitespace-nowrap',
            hasCashLedger ? amountColor : 'text-warning',
          )}
        >
          {signedAmountText}
        </span>
        <span
          className="flex shrink-0 gap-0.5"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          role="presentation"
        >
          <RowActions transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">{projectName ?? '—'}</span>
        <span className="truncate">{categoryLabel}</span>
        {!hasCashLedger && (
          <span className={cn('font-bold uppercase', TRACKING_LABEL)}>{NO_CASH_ENTRY_LABEL}</span>
        )}
      </div>
      {hasEntries && isExpanded ? (
        <div
          className="mt-3 border-t border-border pt-2"
          data-testid={`transaction-details-mobile-${transaction.id}`}
        >
          <AccountingDetailsTable transaction={transaction} />
        </div>
      ) : null}
    </div>
  );
};

function formatAmount(value: number): string {
  return formatCurrency(value);
}
