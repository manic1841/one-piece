import React from 'react';

import { GripVertical } from 'lucide-react';

import { type Account, type AccountWithSnapshot } from '@/domains/account/types/account';
import { AccountCategory } from '@/domains/account/types/categories';
import { Button } from '@/ui/components/ui/button';
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
  switch (category) {
    case AccountCategory.BANK:
      return '銀行';
    case AccountCategory.SECURITIES:
      return '券商';
    case AccountCategory.CASH:
      return '現金';
    default:
      return '帳戶';
  }
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
        'rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all group hover:shadow-md',
        !isActive && 'bg-slate-50 border-slate-200',
        isReorderMode && 'cursor-grab border-dashed border-slate-300 active:cursor-grabbing',
        isDragging && 'scale-[0.98] opacity-60 shadow-none',
        isDragOver && !isDragging && 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-200',
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3
            className={cn(
              'font-semibold text-gray-900 tracking-tight',
              !isActive && 'text-slate-500',
            )}
          >
            {account.name}
          </h3>
          <span className="text-[11px] text-gray-400 tracking-wide">
            {getCategoryLabel(account.category)} · {account.currency}
          </span>
        </div>
        {isReorderMode ? (
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
            <GripVertical size={14} className="text-slate-400" />
            拖拉排序
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border border-slate-200',
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
                  ? 'text-amber-700 hover:text-amber-800'
                  : 'text-emerald-700 hover:text-emerald-800',
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
        <div className="text-xs text-gray-500 uppercase tracking-widest">餘額</div>
        <div className={cn('text-2xl font-bold text-gray-900', !isActive && 'text-slate-500')}>
          {account.snapshot
            ? formatCurrency(
                account.snapshot.originalAmount || account.snapshot.amount,
                account.currency,
              )
            : '尚未設定'}
        </div>
        <div
          className={cn(
            'text-xs text-gray-400 transition-opacity',
            account.snapshot ? 'opacity-0 group-hover:opacity-100' : 'hidden',
          )}
        >
          {account.snapshot
            ? `最後更新：${account.snapshot.year}/${account.snapshot.month.toString().padStart(2, '0')}`
            : ''}
        </div>
      </div>

      {!isReorderMode && (
        <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
          {isActive ? (
            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={() => onOpenSnapshot(account.id)}
            >
              月底餘額
            </Button>
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs text-slate-500">
              停用帳戶不列入月底結算
            </div>
          )}

          <div className="flex items-center justify-between text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              className="text-slate-500 hover:text-slate-700 underline underline-offset-2"
              onClick={() => onEdit(account)}
            >
              編輯帳戶
            </button>
            <button
              type="button"
              className="text-slate-500 hover:text-slate-700 underline underline-offset-2"
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
