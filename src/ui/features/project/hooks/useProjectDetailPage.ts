import { useCallback, useEffect, useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';

import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { type Project } from '@/domains/project/schemas';
import { PROJECT_BALANCE_MISSING } from '@/ui/constants/project/projectDetailLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useProjectCmds } from '@/ui/features/project/hooks/useProjectCmds';
import { useProjectDetailView } from '@/ui/features/project/hooks/useProjectDetailView';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { formatCurrency } from '@/ui/utils';

interface UseProjectDetailPageArgs {
  /** 清單頁傳入已載入的資料，路由進入時為 undefined。 */
  project?: Project;
}

interface ProjectDebtRow {
  id: string;
  name: string;
  balanceText: string;
}

type ProjectFetchState = 'loading' | 'loaded' | 'notFound';

export const useProjectDetailPage = ({ project }: UseProjectDetailPageArgs) => {
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';

  const {
    monthGroups,
    totals,
    latestSnapshot,
    loading: viewLoading,
    error: viewError,
    reload,
  } = useProjectDetailView(householdId, id || '');

  const { updateProject } = useProjectCmds(householdId);
  const { run: runDebt } = useLoadingTask();

  const [projectDebt, setProjectDebt] = useState<ProjectDebtRow[]>([]);
  const [fetchedProject, setFetchedProject] = useState<Project | null>(null);
  const [fetchState, setFetchState] = useState<ProjectFetchState>(project ? 'loaded' : 'loading');
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [statusOverride, setStatusOverride] = useState<boolean | null>(null);

  const loadProject = useCallback(async () => {
    if (project || !householdId || !id) return;
    setFetchState('loading');
    try {
      const { getProjectUseCase } = await import(
        '@/application/project/use_cases/getProjectUseCase'
      );
      const data = await getProjectUseCase.execute({ householdId, projectId: id });
      setFetchedProject(data);
      setFetchState(data ? 'loaded' : 'notFound');
    } catch {
      setFetchedProject(null);
      setFetchState('notFound');
    }
  }, [project, householdId, id]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    const controller = new AbortController();
    void runDebt(
      async () => {
        if (!householdId || !id) return [];
        const accounts = await listDebtAccountsUseCase.execute({
          householdId,
          includeInactive: true,
        });
        return accounts
          .filter((account) => account.linkedProjectId === id)
          .map((account) => ({
            id: account.id,
            name: account.name,
            balanceText: formatCurrency(account.currentBalance),
          }));
      },
      {
        signal: controller.signal,
        writeBack: (result) => {
          if (result.ok) setProjectDebt(result.value);
        },
      },
    );
    return () => controller.abort();
  }, [householdId, id, runDebt]);

  useEffect(() => {
    setNameOverride(null);
    setStatusOverride(null);
  }, [id]);

  const baseProject = project ?? fetchedProject;
  const activeProject = useMemo(
    () => (baseProject && nameOverride ? { ...baseProject, name: nameOverride } : baseProject),
    [baseProject, nameOverride],
  );
  const isActive = statusOverride ?? baseProject?.isActive !== false;

  const handleRename = useCallback(
    async (name: string) => {
      if (!activeProject) return;
      await updateProject(activeProject.id, { name });
      setNameOverride(name);
    },
    [activeProject, updateProject],
  );

  const handleToggleActive = useCallback(async () => {
    if (!activeProject) return;
    const nextActive = !isActive;
    const result = await updateProject(activeProject.id, { isActive: nextActive });
    if (!result.ok) return;
    setStatusOverride(nextActive);
  }, [activeProject, isActive, updateProject]);

  const summary = useMemo(
    () => ({
      income: totals.income,
      expense: totals.expense,
      net: totals.net,
      balanceText: latestSnapshot?.closingBalanceText ?? PROJECT_BALANCE_MISSING,
    }),
    [totals, latestSnapshot],
  );

  const reloadAll = useCallback(async () => {
    await Promise.all([loadProject(), reload()]);
  }, [loadProject, reload]);

  const notFound = fetchState === 'notFound';

  return {
    projectId: id,
    activeProject,
    projectDebt,
    isActive,
    monthGroups,
    summary,
    loading: !notFound && (fetchState === 'loading' || viewLoading),
    error: viewError,
    notFound,
    reload: reloadAll,
    handleRename,
    handleToggleActive,
  };
};

export type ProjectDetailPageController = ReturnType<typeof useProjectDetailPage>;
