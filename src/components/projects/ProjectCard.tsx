import { useProjectBalance } from '@/components/projects/useProjectBalance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Project } from '@/domains/project/types';
import { formatCurrency } from '@/utils/formatUtils';

interface ProjectCardProps {
  householdId?: string;
  project: Project;
  onClick: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ householdId, project, onClick }) => {
  const { balance, year, month } = useProjectBalance(householdId, project.id);

  const isPositive = balance >= 0;

  return (
    <Card
      onClick={onClick}
      className="hover:shadow-md transition-all cursor-pointer hover:border-blue-200"
    >
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        <span
          className={`w-12 h-12 flex items-center justify-center rounded-xl text-xl ${project.color}`}
        >
          {project.icon}
        </span>
        <div>
          <CardTitle className="text-base font-semibold">{project.name}</CardTitle>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Current Balance</span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatCurrency(balance)}
              </span>
              {year && month && (
                <span className="text-xs font-medium text-muted-foreground">
                  ({year}/{month.toString().padStart(2, '0')})
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
