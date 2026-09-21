import React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import CompactRow from '@/ui/components/CompactRow';
import { Button } from '@/ui/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/ui/components/ui/accordion';
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
  NO_CASH_ENTRY_LABEL,
  TRACKING_LABEL,
} from '@/ui/constants/transaction/displayLabels';
import { type TransactionListItemVM } from '@/ui/features/transaction/viewmodels/transaction-list.vm';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

// Must match TransactionList's desktop column count: the accordion spans all of them.
const ACCORDION_ROW_COL_SPAN = 5;

interface TransactionItemProps {
  transaction: TransactionListItemVM;
  onEdit?: (transaction: TransactionListItemVM) => void;
  onDelete?: (transaction: TransactionListItemVM) => void;
}

function AccountingDetailsAccordion({ transaction }: { transaction: TransactionListItemVM }) {
  const detailEntries = transaction.entries ?? [];

  return (
    <Accordion type="single" collapsible className="border-t border-border/50">
      <AccordionItem value="accounting-details" className="border-b-0">
        <AccordionTrigger className="px-4">ACCOUNTING DETAILS</AccordionTrigger>
        <AccordionContent className="px-4">
          <Table>
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
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
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

export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, onEdit, onDelete }) => {
  const {
    displayTitle,
    projectName,
    categoryLabel,
    dateText,
    hasCashLedger,
    isPositive,
    amountText,
  } = transaction;
  const amountColor = isPositive ? 'text-positive' : 'text-negative';

  return (
    <>
      <TableRow data-testid={`transaction-row-${transaction.id}`} className="align-top">
        <TableCell className="font-mono text-[12px] tabular-nums whitespace-nowrap">
          {dateText}
        </TableCell>
        <TableCell>
          <span className="block font-medium">{displayTitle}</span>
          <span className="text-[11px] text-muted-foreground">{categoryLabel}</span>
        </TableCell>
        <TableCell
          className={cn(
            'text-right font-mono tabular-nums whitespace-nowrap',
            hasCashLedger ? amountColor : 'text-warning',
          )}
        >
          {isPositive ? '+' : '-'}
          {amountText}
          {!hasCashLedger && (
            <span className={cn('block font-bold uppercase', TRACKING_LABEL)}>
              {NO_CASH_ENTRY_LABEL}
            </span>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground">{projectName ?? '—'}</TableCell>
        <TableCell>
          <span className="flex justify-end gap-1">
            <RowActions transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
          </span>
        </TableCell>
      </TableRow>
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={ACCORDION_ROW_COL_SPAN} className="p-0">
          <AccountingDetailsAccordion transaction={transaction} />
        </TableCell>
      </TableRow>
    </>
  );
};

export const TransactionItemMobile: React.FC<TransactionItemProps> = ({
  transaction,
  onEdit,
  onDelete,
}) => {
  const { displayTitle, categoryLabel, dateText, hasCashLedger, isPositive, amountText } =
    transaction;
  const amountColor = isPositive ? 'text-positive' : 'text-negative';

  return (
    <CompactRow
      testId={`transaction-row-mobile-${transaction.id}`}
      className="bg-card/50"
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
          {isPositive ? '+' : '-'}
          {amountText}
        </span>
        <span className="flex shrink-0 gap-0.5">
          <RowActions transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">{categoryLabel}</span>
        {!hasCashLedger && (
          <span className={cn('font-bold uppercase', TRACKING_LABEL)}>{NO_CASH_ENTRY_LABEL}</span>
        )}
      </div>
      <div className="mt-2 border-t pt-1">
        <AccountingDetailsAccordion transaction={transaction} />
      </div>
    </CompactRow>
  );
};

function formatAmount(value: number): string {
  return formatCurrency(value);
}
