import React from 'react';

import { Calculator } from 'lucide-react';

import { type ProjectDetailData } from '@/domains/project/types';
import { formatCurrency } from '@/utils/formatUtils';

interface ProjectSnapshotItemProps {
  item: ProjectDetailData;
}

export const ProjectSnapshotItem: React.FC<ProjectSnapshotItemProps> = ({ item }) => {
  const snapshot = item.snapshot;

  if (!snapshot) return null;

  return (
    <div className="p-6 bg-muted/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary">
          <Calculator size={18} />
        </div>
        <h3 className="font-bold text-lg text-foreground">
          {snapshot.year}年{snapshot.month}月 結算
        </h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">期初餘額</p>
          <p className="font-semibold text-foreground">{formatCurrency(snapshot.openingBalance)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">本期收入</p>
          <p className="font-semibold text-green-600">+{formatCurrency(snapshot.income)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">本期支出</p>
          <p className="font-semibold text-red-600">-{formatCurrency(snapshot.expense)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">期末餘額</p>
          <p className="font-bold text-primary">{formatCurrency(snapshot.closingBalance)}</p>
        </div>
      </div>
    </div>
  );
};
