import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { type Transaction as LedgerTransaction, type JournalEntryLine } from '@/domains/ledger/schemas';
import { Button } from '@/ui/components/ui/button';
import { TransactionCategoryLabels } from '@/ui/constants/transaction';
import { formatCurrency, formatDate } from '@/ui/utils';
import { TransactionIcon } from './TransactionIcon';
import { cn } from '@/ui/utils/cn';

interface TransactionItemProps {
  transaction: LedgerTransaction;
  onEdit?: (transaction: LedgerTransaction) => void;
  onDelete?: (transaction: LedgerTransaction) => void;
  projectName?: string;
  getLabel?: (code: string) => string;
}

const CASH_LEDGER_PREFIX = 'asset:cash';

const sumEntries = (transaction: LedgerTransaction) => {
  return transaction.entries.reduce(
    (acc: { debit: number; credit: number }, entry: JournalEntryLine) => {
      acc.debit += entry.debit;
      acc.credit += entry.credit;
      return acc;
    },
    { debit: 0, credit: 0 },
  );
};

const findCashEntry = (transaction: LedgerTransaction) =>
  transaction.entries.find((entry: JournalEntryLine) => entry.ledgerCode.startsWith(CASH_LEDGER_PREFIX));

const getLabelGroup = (intentType: string): Record<string, string> => {
  if (intentType === 'INCOME') return TransactionCategoryLabels.income;
  if (intentType === 'INVESTMENT') return TransactionCategoryLabels.investment;
  if (intentType === 'FINANCING') return TransactionCategoryLabels.financing;
  return TransactionCategoryLabels.expense;
};

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onEdit,
  onDelete,
  projectName,
  getLabel,
}) => {
  const intentType = transaction.intentType || 'MANUAL';
  const isIncome = intentType === 'INCOME';
  const { debit: totalDebit, credit: totalCredit } = sumEntries(transaction);
  const cashEntry = findCashEntry(transaction);
  const hasCashLedger = Boolean(cashEntry);

  // Determine amount
  const displayAmount = transaction.amount || (isIncome ? totalCredit : totalDebit);
  const signedAmount = cashEntry
    ? Math.abs(displayAmount) * (cashEntry.debit > 0 ? 1 : -1)
    : (isIncome ? 1 : -1) * Math.abs(displayAmount);
  
  const isPositive = signedAmount >= 0;
  const amountColor = isPositive ? 'text-emerald-600' : 'text-rose-600';
  const bgAlpha = isPositive ? 'hover:bg-emerald-50/50' : 'hover:bg-rose-50/50';

  // Determine category and title from entries or intent
  const primaryEntry =
    transaction.entries.find((e: JournalEntryLine) => (isIncome ? e.credit > 0 : e.debit > 0)) ||
    transaction.entries[0];

  const ledgerCode = primaryEntry?.ledgerCode || '';
  const categoryKey = ledgerCode.split(':').pop() || '';

  const labels = getLabelGroup(intentType);
  const systemLabel = labels[categoryKey as keyof typeof labels];
  const categoryLabel = getLabel ? getLabel(ledgerCode) : (systemLabel || categoryKey || intentType);
  
  return (
    <div className={cn(
      "group p-4 transition-all duration-200",
      bgAlpha
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
            isPositive ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
          )}>
            <TransactionIcon 
              category={categoryKey} 
              intentType={intentType} 
              size={22} 
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="font-semibold text-gray-900 truncate">
                {transaction.description || categoryLabel}
              </h4>
              {projectName && (
                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-md uppercase tracking-wider">
                  {projectName}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="font-medium text-gray-500">{categoryLabel}</span>
              <span className="w-1 h-1 rounded-full bg-gray-200" />
              <span>{formatDate(new Date(transaction.date))}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right whitespace-nowrap">
            <p className={cn(
              "text-lg font-bold tracking-tight",
              hasCashLedger ? amountColor : 'text-amber-500'
            )}>
              {isPositive ? '+' : '-'}
              {formatCurrency(Math.abs(signedAmount))}
            </p>
            {!hasCashLedger && (
              <p className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter">No Cash Entry</p>
            )}
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(transaction)}
                className="h-9 w-9 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
              >
                <Pencil size={16} />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(transaction)}
                className="h-9 w-9 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
