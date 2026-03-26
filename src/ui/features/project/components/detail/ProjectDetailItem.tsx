import { TrendingDown, TrendingUp } from 'lucide-react';

import { ProjectSnapshotItem } from '@/ui/features/project/components/detail/ProjectSnapshotItem';
import {
  ProjectDetailItemType,
  type ProjectDetailItemVM,
} from '@/ui/features/project/viewmodels/projectDetail.vm';

interface ProjectDetailItemProps {
  item: ProjectDetailItemVM;
  onDeleteSnapshot?: (snapshotId: string) => Promise<void>;
}

export const ProjectDetailItem: React.FC<ProjectDetailItemProps> = ({ item, onDeleteSnapshot }) => {
  if (item.type === ProjectDetailItemType.SNAPSHOT) {
    return <ProjectSnapshotItem item={item} onDelete={onDeleteSnapshot} />;
  }

  return (
    <div className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 flex items-center justify-center rounded-lg bg-${item.color}-100`}
          >
            {item.isIncome ? (
              <TrendingUp className={`text-${item.color}-600`} size={20} />
            ) : (
              <TrendingDown className={`text-${item.color}-600`} size={20} />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">{item.categoryLabel}</p>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.dateText}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`font-semibold ${item.isIncome ? 'text-green-600' : 'text-red-600'}`}>
            {item.amountText}
          </p>
          <p className="text-xs text-muted-foreground">{item.isIncome ? 'Income' : 'Expense'}</p>
        </div>
      </div>
    </div>
  );
};
