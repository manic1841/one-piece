import React from 'react';

import { Edit2, GripVertical, History, Landmark, LineChart, Plus, Wallet } from 'lucide-react';

import { type Account, type AccountWithSnapshot } from '@/domains/account/types/account';
import { AccountCategory } from '@/domains/account/types/categories';
import { Button } from '@/ui/components/ui/button';
import { cn } from '@/ui/utils/cn';

interface AccountCardProps {
  account: AccountWithSnapshot;
  isReorderMode: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onEdit: (account: Account) => void;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
  onOpenSnapshot: (id: string) => void;
  onOpenHistory: (id: string) => void;
}

const getCategoryIcon = (category: AccountCategory) => {
  switch (category) {
    case AccountCategory.BANK:
      return <Landmark className="text-blue-500" size={20} />;
    case AccountCategory.SECURITIES:
      return <LineChart className="text-purple-500" size={20} />;
    case AccountCategory.CASH:
      return <Wallet className="text-amber-500" size={20} />;
    default:
      return <Wallet size={20} />;
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
  onEdit,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
  onOpenSnapshot,
  onOpenHistory,
}) => {
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
        isReorderMode && 'cursor-grab border-dashed border-slate-300 active:cursor-grabbing',
        isDragging && 'scale-[0.98] opacity-60 shadow-none',
        isDragOver && !isDragging && 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-200',
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-white group-hover:scale-110 transition-all">
            {getCategoryIcon(account.category)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{account.name}</h3>
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              {account.currency}
            </span>
          </div>
        </div>
        {isReorderMode ? (
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
            <GripVertical size={14} className="text-slate-400" />
            拖拉排序
          </div>
        ) : (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-blue-600"
              onClick={() => onEdit(account)}
            >
              <Edit2 size={16} />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-sm text-gray-500">最新餘額</div>
        <div className="text-2xl font-bold text-gray-900">
          {account.snapshot
            ? formatCurrency(
                account.snapshot.originalAmount || account.snapshot.amount,
                account.currency,
              )
            : '尚未設定'}
        </div>
        {account.snapshot && (
          <div className="text-xs text-gray-400">
            最後更新：{account.snapshot.year}/{account.snapshot.month.toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {!isReorderMode && (
        <div className="mt-6 pt-6 border-t border-gray-100 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2 text-sm"
            onClick={() => onOpenSnapshot(account.id)}
          >
            <Plus size={14} />
            月底餘額
          </Button>
          <Button
            variant="ghost"
            className="px-3"
            title="歷史記錄"
            onClick={() => onOpenHistory(account.id)}
          >
            <History size={16} className="text-gray-400" />
          </Button>
        </div>
      )}
    </div>
  );
};
