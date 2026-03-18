import React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import { type Transaction as LedgerTransaction } from '@/domains/ledger/schemas';
import { Button } from '@/ui/components/ui/button';
import { TransactionCategoryLabels, TransactionColors } from '@/ui/constants/transaction';
import { formatCurrency, formatDate } from '@/ui/utils';

interface TransactionItemProps {
  transaction: LedgerTransaction;
  onEdit?: (transaction: LedgerTransaction) => void;
  onDelete?: (transaction: LedgerTransaction) => void;
  projectName?: string;
}

const CASH_LEDGER_PREFIX = 'asset:cash';

const sumEntries = (transaction: LedgerTransaction) => {
  const totals = transaction.entries.reduce(
    (acc, entry) => {
      acc.debit += entry.debit;
      acc.credit += entry.credit;
      return acc;
    },
    { debit: 0, credit: 0 },
  );

  return totals;
};

const findCashEntry = (transaction: LedgerTransaction) =>
  transaction.entries.find((entry) => entry.ledgerCode.startsWith(CASH_LEDGER_PREFIX));

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
  const color = signedAmount >= 0 ? TransactionColors.income : TransactionColors.expense;

  // Determine category and title from entries or intent
  const primaryEntry =
    transaction.entries.find((e) => (isIncome ? e.credit > 0 : e.debit > 0)) ||
    transaction.entries[0];

  const ledgerCode = primaryEntry?.ledgerCode || '';
  const categoryKey = ledgerCode.split(':').pop() || '';

  const labels = getLabelGroup(intentType);
  const categoryLabel = labels[categoryKey as keyof typeof labels] || categoryKey || intentType;
  const title = transaction.description
    ? `${categoryLabel} (${transaction.description})`
    : categoryLabel;

  return (
    <div className={`p-4 hover:bg-accent/50 transition-colors bg-${color}-50/30`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full bg-${color}-500`} />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">{title}</p>
                {projectName && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {projectName} 專案
                  </span>
                )}
                <span className="text-[10px] px-1.5 py-0.5 border border-gray-200 text-gray-400 rounded uppercase">
                  {intentType}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(transaction.date)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right space-y-1">
            <p
              className={`text-lg font-bold ${hasCashLedger ? `text-${color}-600` : 'text-yellow-600'}`}
            >
              {signedAmount >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(signedAmount))}
            </p>
            {!hasCashLedger && <p className="text-[10px] text-yellow-700">無 asset:cash 分錄</p>}
          </div>
          {(onEdit || onDelete) && (
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(transaction)}
                  className="text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                >
                  <Pencil size={18} />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(transaction)}
                  className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={18} />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
