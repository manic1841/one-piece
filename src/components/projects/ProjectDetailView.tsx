import { ArrowLeft } from 'lucide-react';

import { useProjectDetailView } from '@/components/projects/detail/useProjectDetailView';
import { useProjectBalance } from '@/components/projects/useProjectBalance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { type Project } from '../../schemas';
import { formatCurrency } from '../../utils/formatUtils';
import { ProjectDetailList } from './detail/ProjectDetailList';

interface ProjectDetailViewProps {
  householdId?: string;
  project: Project;
  onBack: () => void;
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ householdId, project, onBack }) => {
  const { balance } = useProjectBalance(householdId, project.id);
  const { items: transactions } = useProjectDetailView(householdId, project.id);

  const isPositive = balance >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span
              className={`w-12 h-12 flex items-center justify-center rounded-xl text-xl ${project.color}`}
            >
              {project.icon}
            </span>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
              {project.description && (
                <p className="text-muted-foreground mt-1">{project.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-3xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(balance)}
          </p>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <ProjectDetailList items={transactions} />
    </div>
  );
};

export default ProjectDetailView;
