import React from 'react';

import { GripVertical } from 'lucide-react';

import { type Account, type AccountWithSnapshot } from '@/domains/account/types/account';
import { AccountCategory } from '@/domains/account/types/categories';
import { Button } from '@/ui/components/ui/button';
import { AccountCategoryLabels } from '@/ui/constants/account/label';
import { cn } from '@/ui/utils/cn';

interface AccountCardProps {
  account: AccountWithSnapshot;
  isReorderMode: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  toggling: boolean;
  onEdit: (account: Account) => void;
  onToggleActive: (account: Account) => void;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
  onOpenSnapshot: (id: string) => void;
  onOpenHistory: (id: string) => void;
}

const getCategoryLabel = (category: AccountCategory) => {
  return AccountCategoryLabels[category];
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  isReorderMode,
  isDragging,
  isDragOver,
  toggling,
  onEdit,
  onToggleActive,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
  onOpenSnapshot,
  onOpenHistory,
}) => {
  const isActive = account.isActive !== false;

  return (
    <div
      draggable={isReorderMode}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', account.id);
        onDragStart(account.id);
      }}
      onDragEnter={() => onDragEnter(account.id)}
      onDragOver={(event) => {
        if (!isReorderMode) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        onDragEnter(account.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(account.id);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'rounded-xl border border-border bg-card p-6 shadow-sm transition-all group hover:shadow-md',
        !isActive && 'bg-muted border-border',
        isReorderMode && 'cursor-grab border-dashed border-border active:cursor-grabbing',
        isDragging && 'scale-[0.98] opacity-60 shadow-none',
        isDragOver && !isDragging && 'border-primary/60 bg-primary/10 ring-2 ring-primary/30',
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3
            className={cn(
              'font-semibold text-foreground tracking-tight',
              !isActive && 'text-muted-foreground',
            )}
          >
            {account.name}
          </h3>
          <span className="text-[11px] text-muted-foreground tracking-wide">
            {getCategoryLabel(account.category)} · {account.currency}
          </span>
        </div>
        {isReorderMode ? (
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <GripVertical size={14} className="text-muted-foreground" />
            拖拉排序
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                isActive
                  ? 'bg-positive/10 text-positive border border-positive/20'
                  : 'bg-muted text-muted-foreground border border-border',
              )}
            >
              {isActive ? '啟用中' : '已停用'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 px-2 text-xs font-medium',
                isActive
                  ? 'text-warning hover:text-warning/80'
                  : 'text-positive hover:text-positive',
              )}
              onClick={() => onToggleActive(account)}
              disabled={toggling}
            >
              {toggling ? '處理中...' : isActive ? '停用' : '啟用'}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground uppercase tracking-widest">餘額</div>
        <div className={cn('text-2xl font-bold text-foreground', !isActive && 'text-muted-foreground')}>
          {account.snapshot
            ? formatCurrency(
                account.snapshot.originalAmount || account.snapshot.amount,
                account.currency,
              )
            : '尚未設定'}
        </div>
        <div
          className={cn(
            'text-xs text-muted-foreground transition-opacity',
            account.snapshot ? 'opacity-0 group-hover:opacity-100' : 'hidden',
          )}
        >
          {account.snapshot
            ? `最後更新：${account.snapshot.year}/${account.snapshot.month.toString().padStart(2, '0')}`
            : ''}
        </div>
      </div>

      {!isReorderMode && (
        <div className="mt-6 pt-6 border-t border-border space-y-2">
          {isActive ? (
            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={() => onOpenSnapshot(account.id)}
            >
              月底餘額
            </Button>
          ) : (
            <div className="rounded-md border border-border bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
              停用帳戶不列入月底結算
            </div>
          )}

          <div className="flex items-center justify-between text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground underline underline-offset-2"
              onClick={() => onEdit(account)}
            >
              編輯帳戶
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground underline underline-offset-2"
              onClick={() => onOpenHistory(account.id)}
            >
              歷史記錄
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
