import React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

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
import { ACCOUNTING_DETAILS_ENTRY_LABEL } from '@/ui/constants/transaction/displayLabels';
import { type TransactionListItemVM } from '@/ui/features/transaction/viewmodels/transaction-list.vm';
import { cn } from '@/ui/utils/cn';

interface TransactionItemProps {
  transaction: TransactionListItemVM;
  onEdit?: (transaction: TransactionListItemVM) => void;
  onDelete?: (transaction: TransactionListItemVM) => void;
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
    entries,
  } = transaction;
  const amountColor = isPositive ? 'text-positive' : 'text-negative';
  const detailEntries = entries ?? [];

  return (
    <div className="border-b border-border last:border-b-0">
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
            <span className="block text-[9px] font-bold uppercase tracking-tighter">
              No Cash Entry
            </span>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground">{projectName ?? '—'}</TableCell>
        <TableCell>
          <span className="flex justify-end gap-1">
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
          </span>
        </TableCell>
      </TableRow>
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
    </div>
  );
};

function formatAmount(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
