import React, { useState } from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  MobileExpandableRow,
  NumberCell,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { Button } from '@/ui/components/ui/button';
import {
  ACCOUNTING_DETAILS_CREDIT_LABEL,
  ACCOUNTING_DETAILS_DEBIT_LABEL,
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

/** 會計科目 60% / Debit 20% / Credit 20%（總和 100）。 */
const ACCOUNTING_DETAILS_COLUMN_WIDTHS = [60, 20, 20] as const;

function AccountingDetailsTable({ transaction }: { transaction: TransactionListItemVM }) {
  const detailEntries = transaction.entries ?? [];

  return (
    <div className="px-3 pb-4 pt-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {ACCOUNTING_DETAILS_SECTION_LABEL}
      </p>
      <DataTable className="mt-2">
        <DataTableColGroup widths={ACCOUNTING_DETAILS_COLUMN_WIDTHS} />
        <TableHeader>
          <DataTableHeadRow>
            <DataTableHeadCell>{ACCOUNTING_DETAILS_ENTRY_LABEL}</DataTableHeadCell>
            <DataTableHeadCell align="number">{ACCOUNTING_DETAILS_DEBIT_LABEL}</DataTableHeadCell>
            <DataTableHeadCell align="number">{ACCOUNTING_DETAILS_CREDIT_LABEL}</DataTableHeadCell>
          </DataTableHeadRow>
        </TableHeader>
        <TableBody>
          {detailEntries.map((entry, index) => (
            <DataTableRow key={`${entry.ledgerCode}-${index}`}>
              <DataTableCell className="font-mono text-[12px]">{entry.ledgerLabel}</DataTableCell>
              <NumberCell value={entry.debit > 0 ? entry.debit : null} format={formatCurrency} />
              <NumberCell value={entry.credit > 0 ? entry.credit : null} format={formatCurrency} />
            </DataTableRow>
          ))}
        </TableBody>
      </DataTable>
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
      <DataTableRow
        data-testid={`transaction-row-${transaction.id}`}
        className={cn('align-top group', isExpanded && 'border-b-0 bg-muted/50')}
        interactive={hasEntries}
        aria-expanded={hasEntries ? isExpanded : undefined}
        tabIndex={hasEntries ? 0 : undefined}
        onClick={hasEntries ? () => setIsExpanded((prev) => !prev) : undefined}
        onKeyDown={hasEntries ? handleRowKeyDown : undefined}
      >
        <DataTableCell className="font-mono text-[12px] tabular-nums whitespace-nowrap">
          {dateText}
        </DataTableCell>
        <DataTableCell>
          <span className="block font-medium">{displayTitle}</span>
          <span className="text-[11px] text-muted-foreground">{categoryLabel}</span>
        </DataTableCell>
        <DataTableCell className="text-muted-foreground">{projectName ?? '—'}</DataTableCell>
        <DataTableCell
          className={cn(
            'font-mono tabular-nums whitespace-nowrap',
            hasCashLedger ? amountColor : 'text-warning',
          )}
          align="number"
        >
          {signedAmountText}
          {!hasCashLedger && (
            <span className={cn('block font-bold uppercase', TRACKING_LABEL)}>
              {NO_CASH_ENTRY_LABEL}
            </span>
          )}
        </DataTableCell>
        <DataTableCell>
          <span className="flex justify-end gap-1 opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100">
            <RowActions transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
          </span>
        </DataTableCell>
      </DataTableRow>
      {hasEntries && isExpanded ? (
        <DataTableRow
          className="hover:bg-transparent"
          data-testid={`transaction-details-${transaction.id}`}
        >
          <DataTableCell colSpan={ACCORDION_ROW_COL_SPAN} className="p-0">
            <AccountingDetailsTable transaction={transaction} />
          </DataTableCell>
        </DataTableRow>
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
  const hasEntries = (transaction.entries ?? []).length > 0;

  return (
    <MobileExpandableRow
      data-testid={`transaction-row-mobile-${transaction.id}`}
      summary={
        <>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground whitespace-nowrap">
            {dateText}
          </span>
          <span className="min-w-0 truncate text-sm font-medium">{displayTitle}</span>
        </>
      }
      value={
        <span
          className={cn(
            'font-mono text-sm tabular-nums',
            hasCashLedger ? amountColor : 'text-warning',
          )}
        >
          {signedAmountText}
        </span>
      }
      actions={<RowActions transaction={transaction} onEdit={onEdit} onDelete={onDelete} />}
      meta={
        <>
          <span className="truncate">{projectName ?? '—'}</span>
          <span className="truncate">{categoryLabel}</span>
          {!hasCashLedger && (
            <span className={cn('font-bold uppercase', TRACKING_LABEL)}>{NO_CASH_ENTRY_LABEL}</span>
          )}
        </>
      }
      details={
        hasEntries ? (
          <div data-testid={`transaction-details-mobile-${transaction.id}`}>
            <AccountingDetailsTable transaction={transaction} />
          </div>
        ) : undefined
      }
    />
  );
};
