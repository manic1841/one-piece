import { useState } from 'react';

import { ArrowLeft, BarChart3 } from 'lucide-react';

import SettlementDialog from '@/components/projects/SettlementDialog';
import { useProjectDetailView } from '@/components/projects/detail/useProjectDetailView';
import { useProjectBalance } from '@/components/projects/useProjectBalance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/useAuth';
import { type Project } from '@/schemas';
import { formatCurrency } from '@/utils/formatUtils';

import { ProjectDetailList } from './detail/ProjectDetailList';

interface ProjectDetailViewProps {
  householdId?: string;
  project: Project;
  onBack: () => void;
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ householdId, project, onBack }) => {
  const { userProfile } = useAuth();
  const { balance } = useProjectBalance(householdId, project.id);
  const {
    items: transactions,
    reload,
    deleteSnapshot,
  } = useProjectDetailView(householdId, project.id);

  const [isSettlementOpen, setIsSettlementOpen] = useState(false);

  const isPositive = balance >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex-1">
          <div className="flex justify-between items-center">
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
                {project.accounting?.enabled && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {project.accounting.incomeStatement && (
                      <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-md">
                        IS:{' '}
                        {project.accounting.incomeStatement.subcategory ??
                          project.accounting.incomeStatement.category}
                      </span>
                    )}
                    {project.accounting.balanceSheet && (
                      <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-md">
                        BS:{' '}
                        {project.accounting.balanceSheet.subcategory ??
                          project.accounting.balanceSheet.category}
                      </span>
                    )}
                    {project.accounting.cashFlow && (
                      <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-1 rounded-md">
                        CF:{' '}
                        {project.accounting.cashFlow.subcategory ??
                          project.accounting.cashFlow.category}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button className="gap-2" variant="outline" onClick={() => setIsSettlementOpen(true)}>
              <BarChart3 size={20} />
              結算 (Snapshot)
            </Button>
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
      <ProjectDetailList items={transactions} onDeleteSnapshot={deleteSnapshot} />

      {/* Settlement Dialog */}
      {isSettlementOpen && householdId && (
        <SettlementDialog
          isOpen={isSettlementOpen}
          onClose={() => setIsSettlementOpen(false)}
          projects={[project]}
          householdId={householdId}
          email={userProfile?.email || ''}
          onSuccess={() => {
            reload();
          }}
        />
      )}
    </div>
  );
};

export default ProjectDetailView;
