import React, { useEffect, useMemo, useState } from 'react';

import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { type Project } from '@/ui/features/project/viewmodels/projectForm.vm';
import { useAuthState } from '@/ui/contexts/useAuthState';
import CompactRow from '@/ui/components/CompactRow';
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
import { GripHandle, SortableListScope } from '@/ui/components/sortable/SortableListScope';
import { useSortableRow } from '@/ui/hooks/useSortableList';
import ProjectForm from '@/ui/features/project/components/ProjectForm';
import { useProjectPage } from '@/ui/features/project/hooks/useProjectPage';
import { useProjectQueries } from '@/ui/features/project/hooks/useProjects';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

interface ProjectTotals {
  income: number;
  expense: number;
}

interface ProjectRowVM {
  id: string;
  name: string;
  isActive: boolean;
  income: number;
  expense: number;
  net: number;
}

const SortableProjectRow: React.FC<{
  row: ProjectRowVM;
  onNavigate: (path: string) => void;
}> = ({ row, onNavigate }) => {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, rowStyle, isDragging } =
    useSortableRow(row.id);

  return (
    <TableRow
      ref={setNodeRef}
      data-testid={`project-row-${row.id}`}
      onClick={() => onNavigate(`/projects/${row.id}`)}
      interactive
      className={cn('cursor-pointer', isDragging && 'opacity-50')}
      style={rowStyle}
    >
      <TableCell className="w-10 pr-0">
        <GripHandle
          label={`Reorder ${row.name}`}
          testId={`project-grip-${row.id}`}
          attributes={attributes}
          listeners={listeners}
          activatorRef={setActivatorNodeRef}
          className={row.isActive ? '' : 'opacity-60'}
        />
      </TableCell>
      <TableCell className={row.isActive ? '' : 'text-muted-foreground'}>
        {row.name}
      </TableCell>
      <TableCell>
        <span className={row.isActive ? 'text-positive' : 'text-muted-foreground'}>
          {row.isActive ? '進行中' : '停用'}
        </span>
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">
        {formatCurrency(row.income)}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">
        {formatCurrency(row.expense)}
      </TableCell>
      <TableCell
        className={`text-right font-mono tabular-nums ${row.net >= 0 ? 'text-positive' : 'text-negative'}`}
      >
        {formatCurrency(row.net)}
      </TableCell>
    </TableRow>
  );
};

const SortableProjectCompactRow: React.FC<{
  row: ProjectRowVM;
  onNavigate: (path: string) => void;
}> = ({ row, onNavigate }) => {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, rowStyle, isDragging } =
    useSortableRow(row.id);

  return (
    <CompactRow
      ref={setNodeRef}
      testId={`project-row-mobile-${row.id}`}
      onClick={() => onNavigate(`/projects/${row.id}`)}
      className={cn('cursor-pointer', isDragging ? 'opacity-50' : row.isActive ? 'bg-card/50' : 'bg-transparent')}
      style={rowStyle}
    >
      <div className="flex items-center justify-between gap-2">
        <GripHandle
          label={`Reorder ${row.name}`}
          testId={`project-grip-${row.id}`}
          attributes={attributes}
          listeners={listeners}
          activatorRef={setActivatorNodeRef}
          className="-ml-1 mr-1"
        />
        <span
          className={`flex min-w-0 items-center gap-2 text-sm font-medium ${row.isActive ? '' : 'text-muted-foreground'}`}
        >
          <span
            className={`text-[10px] leading-none ${row.isActive ? 'text-positive' : 'text-muted-foreground'}`}
          >
            {row.isActive ? '●' : '⊘'}
          </span>
          <span className="truncate">{row.name}</span>
        </span>
        <span
          className={`ml-auto font-mono text-sm tabular-nums ${row.net >= 0 ? 'text-positive' : 'text-negative'}`}
        >
          {formatCurrency(row.net)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="whitespace-nowrap">
          {`Income ${formatCurrency(row.income)} · Expense ${formatCurrency(row.expense)}`}
        </span>
        <span className="whitespace-nowrap">{row.isActive ? '進行中' : '停用'}</span>
      </div>
    </CompactRow>
  );
};

const Projects: React.FC = () => {
  const { userProfile } = useAuthState();
  const navigate = useNavigate();

  const {
    loading,
    projects,
    create,
    isFormOpen,
    openForm,
    closeForm,
    showInactive,
    toggleShowInactive,
    handleReorder,
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

  const visibleProjects = useMemo(
    () => projects.filter((project) => showInactive || project.isActive),
    [projects, showInactive],
  );

  const rows: ProjectRowVM[] = visibleProjects.map((project) => {
    const totals = snapshotTotals.get(project.id) ?? { income: 0, expense: 0 };
    const net = totals.income - totals.expense;
    return {
      id: project.id,
      name: project.name,
      isActive: project.isActive,
      income: totals.income,
      expense: totals.expense,
      net,
    };
  });

  const handleRowsReorder = (orderedRows: ProjectRowVM[]) => {
    const projectById = new Map(projects.map((project) => [project.id, project]));
    const ordered = orderedRows
      .map((row) => projectById.get(row.id))
      .filter((project): project is Project => project !== undefined);
    handleReorder(ordered);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="專案管理"
        description="管理專案餘額與排序。"
        meta={
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>進行中 {projects.filter((p) => p.isActive).length} 筆</span>
            <button
              type="button"
              className="underline underline-offset-2 transition-[color,background-color,transform] duration-fast ease-out-quint hover:text-foreground active:scale-[0.97]"
              onClick={toggleShowInactive}
            >
              {showInactive ? '隱藏停用' : '顯示停用'}
            </button>
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-3">
            <Button onClick={openForm} className="gap-2">
              <Plus size={16} />
              New Project
            </Button>
          </div>
        }
      />

      {/* DndContext renders aria-live divs, so it must wrap the table
          rather than sit inside tbody (invalid HTML). */}
      <SortableListScope items={rows} onReorder={handleRowsReorder}>
        <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Income</TableHead>
              <TableHead className="text-right">Expense</TableHead>
              <TableHead className="text-right">Net Cash Flow</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <SortableProjectRow key={row.id} row={row} onNavigate={navigate} />
            ))}
          </TableBody>
        </Table>
      </SortableListScope>

      <SortableListScope items={rows} onReorder={handleRowsReorder}>
        <div className="space-y-2 md:hidden">
          {rows.map((row) => (
            <SortableProjectCompactRow key={row.id} row={row} onNavigate={navigate} />
          ))}
        </div>
      </SortableListScope>

      <ProjectForm isOpen={isFormOpen} onClose={closeForm} onSubmit={create} />
    </div>
  );
};

export default Projects;
