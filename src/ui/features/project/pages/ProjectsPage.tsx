import React, { useEffect, useState } from 'react';

import { Calendar, Plus, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/infra/contexts/useAuth';
import { Button } from '@/ui/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/components/ui/table';
import { PageHeader } from '@/ui/components/PageHeader';
import ProjectForm from '@/ui/features/project/components/ProjectForm';
import { useProjectPage } from '@/ui/features/project/hooks/useProjectPage';
import { useProjectQueries } from '@/ui/features/project/hooks/useProjects';
import { formatCurrency } from '@/ui/utils';
import MonthlySettlement from './MonthlySettlement';
import ProjectSettings from './ProjectSettings';

interface ProjectTotals {
  income: number;
  expense: number;
}

const Projects: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const {
    loading,
    projects,
    reload,
    create,
    isFormOpen,
    openForm,
    closeForm,
    isMonthlySettlementView,
    openMonthlySettlement,
    closeMonthlySettlement,
    isSettingsOpen,
    openSettings,
    closeSettings,
  } = useProjectPage(userProfile?.householdId);

  const { getProjectSnapshots } = useProjectQueries(userProfile?.householdId || '');

  const [snapshotTotals, setSnapshotTotals] = useState<Map<string, ProjectTotals>>(new Map());

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!userProfile?.householdId || projects.length === 0) return;
      const results = await Promise.all(
        projects.map(async (project) => {
          const snapshots = await getProjectSnapshots(project.id);
          const income = (snapshots || []).reduce((sum, s) => sum + s.income, 0);
          const expense = (snapshots || []).reduce((sum, s) => sum + s.expense, 0);
          return [project.id, { income, expense }] as const;
        }),
      );
      if (!ignore) {
        setSnapshotTotals(new Map(results));
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [projects, userProfile?.householdId, getProjectSnapshots]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isSettingsOpen) {
    return <ProjectSettings householdId={userProfile?.householdId || ''} onBack={closeSettings} />;
  }

  if (isMonthlySettlementView) {
    return (
      <MonthlySettlement
        householdId={userProfile?.householdId || ''}
        userEmail={userProfile?.email || ''}
        projects={projects.filter((p) => p.isActive)}
        onBack={closeMonthlySettlement}
        onSuccess={reload}
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="專案管理"
        description="管理專案餘額、月度結算與排序。"
        actions={
          <div className="flex gap-3">
            <Button onClick={openSettings} variant="outline" className="gap-2">
              <Settings size={18} />
              Settings
            </Button>
            <Button onClick={openMonthlySettlement} variant="outline" className="gap-2">
              <Calendar size={16} />
              Settlement
            </Button>
            <Button onClick={openForm} className="gap-2">
              <Plus size={16} />
              New Project
            </Button>
          </div>
        }
      />

      <Table className="hidden md:table">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Income</TableHead>
            <TableHead className="text-right">Expense</TableHead>
            <TableHead className="text-right">Net Cash Flow</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const totals = snapshotTotals.get(project.id) ?? { income: 0, expense: 0 };
            const net = totals.income - totals.expense;
            return (
              <TableRow
                key={project.id}
                data-testid={`project-row-${project.id}`}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="cursor-pointer"
              >
                <TableCell className={project.isActive ? '' : 'text-muted-foreground'}>
                  {project.name}
                </TableCell>
                <TableCell>
                  <span className={project.isActive ? 'text-positive' : 'text-muted-foreground'}>
                    {project.isActive ? '進行中' : '停用'}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCurrency(totals.income)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCurrency(totals.expense)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono tabular-nums ${net >= 0 ? 'text-positive' : 'text-negative'}`}
                >
                  {formatCurrency(net)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="space-y-2 md:hidden">
        {projects.map((project) => {
          const totals = snapshotTotals.get(project.id) ?? { income: 0, expense: 0 };
          const net = totals.income - totals.expense;
          return (
            <div
              key={project.id}
              data-testid={`project-row-mobile-${project.id}`}
              onClick={() => navigate(`/projects/${project.id}`)}
              className="cursor-pointer rounded-md border p-3 md:hidden"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`flex min-w-0 items-center gap-2 text-sm font-medium ${project.isActive ? '' : 'text-muted-foreground'}`}
                >
                  <span
                    className={`text-[10px] leading-none ${project.isActive ? 'text-positive' : 'text-muted-foreground'}`}
                  >
                    {project.isActive ? '●' : '⊘'}
                  </span>
                  <span className="truncate">{project.name}</span>
                </span>
                <span
                  className={`ml-auto font-mono text-sm tabular-nums ${net >= 0 ? 'text-positive' : 'text-negative'}`}
                >
                  {formatCurrency(net)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="whitespace-nowrap">
                  {`Income ${formatCurrency(totals.income)} · Expense ${formatCurrency(totals.expense)}`}
                </span>
                <span className="whitespace-nowrap">{project.isActive ? '進行中' : '停用'}</span>
              </div>
            </div>
          );
        })}
      </div>

      <ProjectForm isOpen={isFormOpen} onClose={closeForm} onSubmit={create} />
    </div>
  );
};

export default Projects;
