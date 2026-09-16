import React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import { type TransactionListItemVM } from '@/ui/features/transaction/viewmodels/transaction-list.vm';
import { cn } from '@/ui/utils/cn';

import { TransactionIcon } from './TransactionIcon';

interface TransactionItemProps {
  transaction: TransactionListItemVM;
  onEdit?: (transaction: TransactionListItemVM) => void;
  onDelete?: (transaction: TransactionListItemVM) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onEdit,
  onDelete,
}) => {
  const {
    intentType,
    categoryKey,
    displayTitle,
    projectName,
    categoryLabel,
    dateText,
    hasCashLedger,
    isPositive,
    amountText,
  } = transaction;
  const amountColor = isPositive ? 'text-positive' : 'text-negative';
  const bgAlpha = isPositive ? 'hover:bg-positive/5' : 'hover:bg-negative/5';

  return (
    <div className={cn('group p-4 transition-all duration-200', bgAlpha)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div
            className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105',
              isPositive ? 'bg-positive/15 text-positive' : 'bg-negative/15 text-negative',
            )}
          >
            <TransactionIcon category={categoryKey} intentType={intentType} size={22} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="font-semibold text-foreground truncate">{displayTitle}</h4>
              {projectName && (
                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 bg-accent text-muted-foreground rounded-md uppercase tracking-wider">
                  {projectName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-muted-foreground">{categoryLabel}</span>
              <span className="w-1 h-1 rounded-full bg-muted" />
              <span>{dateText}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right whitespace-nowrap">
            <p
              className={cn(
                'text-lg font-bold tracking-tight tabular-nums',
                hasCashLedger ? amountColor : 'text-warning',
              )}
            >
              {isPositive ? '+' : '-'}
              {amountText}
            </p>
            {!hasCashLedger && (
              <p className="text-[9px] font-bold text-warning uppercase tracking-tighter">
                No Cash Entry
              </p>
            )}
          </div>

          <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(transaction)}
                aria-label="編輯交易"
                className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"
              >
                <Pencil size={16} />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(transaction)}
                aria-label="刪除交易"
                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
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
