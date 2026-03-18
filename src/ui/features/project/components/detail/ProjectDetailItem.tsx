import { TrendingDown, TrendingUp } from 'lucide-react';
import { ProjectDetailType, type ProjectDetailData } from '@/domains/project/types/detail';
import { ProjectSnapshotItem } from '@/ui/features/project/components/detail/ProjectSnapshotItem';
import { useProjectDetailItem } from '@/ui/features/project/components/detail/useProjectDetailItem';
import { formatCurrency, formatDate } from '@/ui/utils';

interface ProjectDetailItemProps {
  item: ProjectDetailData;
  onDeleteSnapshot?: (snapshotId: string) => Promise<void>;
}

export const ProjectDetailItem: React.FC<ProjectDetailItemProps> = ({ item, onDeleteSnapshot }) => {
  const { isIncome, color, category } = useProjectDetailItem(item);

  if (item.type === ProjectDetailType.SNAPSHOT) {
    return <ProjectSnapshotItem item={item} onDelete={onDeleteSnapshot} />;
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
            <p className="text-xs text-muted-foreground mt-1">{formatDate(item.date)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
            {isIncome ? '+' : '-'}
            {formatCurrency(item.amount)}
          </p>
          <p className="text-xs text-muted-foreground">{isIncome ? 'Income' : 'Expense'}</p>
        </div>
      </div>
    </div>
  );
};
