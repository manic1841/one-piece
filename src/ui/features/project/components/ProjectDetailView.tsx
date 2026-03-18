import { useState } from 'react';

import { ArrowLeft, BarChart3 } from 'lucide-react';

import { type Project } from '@/domains/project/schemas';
import { useAuth } from '@/infra/contexts/useAuth';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { Checkbox } from '@/ui/components/ui/checkbox';
import { Label } from '@/ui/components/ui/label';
import { useProjectBalance } from '@/ui/features/project/hooks/useProjectBalance';
import { useProjectCmds } from '@/ui/features/project/hooks/useProjectCmds';
import { useProjectDetailView } from '@/ui/features/project/hooks/useProjectDetailView';
import { formatCurrency } from '@/ui/utils';
import { logger } from '@/utils/logger';

import SettlementDialog from './SettlementDialog';
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
    history,
    selectedYearMonth,
    setSelectedYearMonth,
    currentSnapshot,
    reload,
    deleteSnapshot,
  } = useProjectDetailView(householdId || '', project.id);
  const { updateProject } = useProjectCmds(householdId || '');

  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [active, setActive] = useState(project.isActive);

  const handleToggleActive = async (checked: boolean | string) => {
    if (!householdId) return;
    const isActive = !!checked;
    try {
      setActive(isActive);
      await updateProject(project.id, { isActive });
      reload();
    } catch (error) {
      logger.error('Failed to toggle active status', 'ProjectDetailView', { error });
      setActive(!checked); // Revert UI if failed
    }
  };

  const displayBalance =
    selectedYearMonth === 'current' ? balance : (currentSnapshot?.closingBalance ?? 0);
  const isPositive = displayBalance >= 0;

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
                className="w-12 h-12 flex items-center justify-center rounded-xl text-xl"
                style={{ backgroundColor: project.color }}
              >
                {project.icon}
              </span>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                <div className="flex items-center gap-4 mt-2">
                  <select
                    value={selectedYearMonth}
                    onChange={(e) => setSelectedYearMonth(e.target.value)}
                    className="p-1 border rounded-md text-sm"
                  >
                    <option value="current">Current (Real-time)</option>
                    {history.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  {selectedYearMonth === 'current' && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="project-active"
                        checked={active}
                        onCheckedChange={(checked) => handleToggleActive(!!checked)}
                      />
                      <Label
                        htmlFor="project-active"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        Active
                      </Label>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="gap-2" variant="outline" onClick={() => setIsSettlementOpen(true)}>
                <BarChart3 size={20} />
                Snapshot
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {selectedYearMonth === 'current'
              ? 'Current Balance'
              : `Snapshot Balance (${selectedYearMonth})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(displayBalance)}
            </p>
            {selectedYearMonth !== 'current' && currentSnapshot && (
              <span className="text-sm text-muted-foreground">
                (Inc: {formatCurrency(currentSnapshot.income)}, Exp:{' '}
                {formatCurrency(currentSnapshot.expense)})
              </span>
            )}
          </div>
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
