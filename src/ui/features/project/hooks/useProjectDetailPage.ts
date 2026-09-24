import { useCallback, useEffect, useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';

import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { type Project } from '@/domains/project/schemas';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useProjectCmds } from '@/ui/features/project/hooks/useProjectCmds';
import { useProjectDetailView } from '@/ui/features/project/hooks/useProjectDetailView';
import {
  ProjectDetailItemType,
  type ProjectRecordItemVM,
  type ProjectSnapshotItemVM,
  toExpenseBreakdown,
} from '@/ui/features/project/viewmodels/projectDetail.vm';
import { formatCurrency } from '@/ui/utils';

interface UseProjectDetailPageArgs {
  /** The list page passes the already-loaded row; the route passes nothing. */
  project?: Project;
}

interface ProjectDebtRow {
  id: string;
  name: string;
  balanceText: string;
}

/**
 * Owns ProjectDetailPage's data: the project row, its debt links, the selected
 * period's records and the derived summary. The page keeps only rendering.
 */
export const useProjectDetailPage = ({ project }: UseProjectDetailPageArgs) => {
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';

  const { items, selectedYearMonth, setSelectedYearMonth, currentSnapshot } =
    useProjectDetailView(householdId, id || '');

  const { updateProject } = useProjectCmds(householdId);

  const [projectDebt, setProjectDebt] = useState<ProjectDebtRow[]>([]);
  const [fetchedProject, setFetchedProject] = useState<Project | null>(null);
  const [statusOverride, setStatusOverride] = useState<boolean | null>(null);

  const activeProject = project ?? fetchedProject;

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!householdId || !id) return;
      const accounts = await listDebtAccountsUseCase.execute({
        householdId,
        includeInactive: true,
      });
      if (!ignore) {
        setProjectDebt(
          accounts
            .filter((a) => a.linkedProjectId === id)
            .map((a) => ({
              id: a.id,
              name: a.name,
              balanceText: formatCurrency(a.currentBalance),
            })),
        );
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [householdId, id]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (project || !householdId || !id) return;
      try {
        const { getProjectUseCase } = await import(
          '@/application/project/use_cases/getProjectUseCase'
        );
        const data = await getProjectUseCase.execute({ householdId, projectId: id });
        if (!ignore) {
          setFetchedProject(data);
        }
      } catch {
        if (!ignore) setFetchedProject(null);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [project, householdId, id]);

  useEffect(() => {
    setStatusOverride(null);
  }, [id]);

  const refreshProject = useCallback(
    async (projectId: string) => {
      const { getProjectUseCase } = await import('@/application/project/use_cases/getProjectUseCase');
      const data = await getProjectUseCase.execute({ householdId, projectId });
      if (data) setFetchedProject(data);
    },
    [householdId],
  );

  const handleRename = useCallback(
    async (name: string) => {
      if (!activeProject) return;
      await updateProject(activeProject.id, { name });
      setFetchedProject((prev) =>
        prev && prev.id === activeProject.id ? { ...prev, name } : prev,
      );
    },
    [activeProject, updateProject],
  );

  const isActive = statusOverride ?? activeProject?.isActive !== false;

  const handleToggleActive = useCallback(async () => {
    if (!activeProject) return;
    const nextActive = !isActive;

    const result = await updateProject(activeProject.id, { isActive: nextActive });
    if (!result.ok) return;
    setStatusOverride(nextActive);
    if (!project) {
      await refreshProject(activeProject.id);
    }
  }, [activeProject, isActive, project, refreshProject, updateProject]);

  const records = useMemo(
    () =>
      items.filter(
        (item): item is ProjectRecordItemVM => item.type === ProjectDetailItemType.RECORD,
      ),
    [items],
  );

  const snapshots = useMemo(
    () =>
      items.filter(
        (item): item is ProjectSnapshotItemVM => item.type === ProjectDetailItemType.SNAPSHOT,
      ),
    [items],
  );

  const expenseBreakdown = useMemo(() => toExpenseBreakdown(items), [items]);

  const summary = useMemo(() => {
    const income = records.filter((r) => r.isIncome).reduce((sum, r) => sum + r.amount, 0);
    const expense = records.filter((r) => !r.isIncome).reduce((sum, r) => sum + r.amount, 0);
    const net = income - expense;
    return {
      income,
      expense,
      net,
      balanceText: formatCurrency(currentSnapshot?.closingBalance ?? net),
    };
  }, [records, currentSnapshot]);

  return {
    projectId: id,
    activeProject,
    projectDebt,
    isActive,
    records,
    snapshots,
    expenseBreakdown,
    summary,
    selectedYearMonth,
    setSelectedYearMonth,
    handleRename,
    handleToggleActive,
  };
};

export type ProjectDetailPageController = ReturnType<typeof useProjectDetailPage>;
