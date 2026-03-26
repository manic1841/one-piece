import React from 'react';

import { Calculator, Trash2 } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import { type ProjectSnapshotItemVM } from '@/ui/features/project/viewmodels/projectDetail.vm';

interface ProjectSnapshotItemProps {
  item: ProjectSnapshotItemVM;
  onDelete?: (snapshotId: string) => Promise<void>;
}

export const ProjectSnapshotItem: React.FC<ProjectSnapshotItemProps> = ({ item, onDelete }) => {
  const handleDelete = async () => {
    if (!onDelete || !item.id) return;
    if (window.confirm(`確定要刪除 ${item.year}年${item.month}月的結算紀錄嗎？`)) {
      await onDelete(item.id);
    }
  };

  return (
    <div className="p-6 bg-muted/30 relative group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary">
            <Calculator size={18} />
          </div>
          <h3 className="font-bold text-lg text-foreground">
            {item.year}年{item.month}月 月結單
          </h3>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDelete}
          >
            <Trash2 size={18} />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">期初餘額</p>
          <p className="font-semibold text-foreground">{item.openingBalanceText}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">本月收入</p>
          <p className="font-semibold text-green-600">+{item.incomeText}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">本月支出</p>
          <p className="font-semibold text-red-600">-{item.expenseText}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">期末餘額</p>
          <p className="font-bold text-primary">{item.closingBalanceText}</p>
        </div>
      </div>
    </div>
  );
};
