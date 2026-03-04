import { ProjectDetailItem } from '@/components/projects/detail/ProjectDetailItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type ProjectDetailData } from '@/domains/project/types';

interface ProjectDetailListProps {
  items: ProjectDetailData[];
  onDeleteSnapshot?: (snapshotId: string) => Promise<void>;
}

export const ProjectDetailList: React.FC<ProjectDetailListProps> = ({
  items,
  onDeleteSnapshot,
}) => {
  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>歷史紀錄</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No transactions found for this project.
            </div>
          ) : (
            items.map((item, index) => {
              return (
                <ProjectDetailItem
                  key={`tx-${item.id}-${index}`}
                  item={item}
                  onDeleteSnapshot={onDeleteSnapshot}
                />
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};
