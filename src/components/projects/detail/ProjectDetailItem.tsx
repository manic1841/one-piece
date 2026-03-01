import { TrendingDown, TrendingUp } from 'lucide-react';

import { ProjectSnapshotItem } from '@/components/projects/detail/ProjectSnapshotItem';
import { useProjectDetailItem } from '@/components/projects/detail/useProjectDetailItem';
import { type ProjectDetailData, ProjectDetailType } from '@/domains/project/types';
import { toDateString } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatUtils';

interface ProjectDetailItemProps {
  item: ProjectDetailData;
}

export const ProjectDetailItem: React.FC<ProjectDetailItemProps> = ({ item }) => {
  const { isIncome, color, category } = useProjectDetailItem(item);

  if (item.type === ProjectDetailType.SNAPSHOT) {
    return <ProjectSnapshotItem item={item} />;
  }

  return (
    <div className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 flex items-center justify-center rounded-lg bg-${color}-100`}>
            {isIncome ? (
              <TrendingUp className={`text-${color}-600`} size={20} />
            ) : (
              <TrendingDown className={`text-${color}-600`} size={20} />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">{category}</p>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            <p className="text-xs text-muted-foreground mt-1">{toDateString(item.date)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`font-semibold text-${color}-600`}>
            {isIncome ? '+' : '-'}
            {formatCurrency(item.amount)}
          </p>
          <p className="text-xs text-muted-foreground">{isIncome ? 'Income' : 'Expense'}</p>
        </div>
      </div>
    </div>
  );
};
