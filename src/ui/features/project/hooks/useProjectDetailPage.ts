import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { type Project } from '@/domains/project/schemas';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import {
  PROJECT_DANGER_LABELS,
  PROJECT_DETAIL_LABELS,
} from '@/ui/constants/project/projectDetailLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useProjectCmds } from '@/ui/features/project/hooks/useProjectCmds';
import { useProjectDetailView } from '@/ui/features/project/hooks/useProjectDetailView';
import {
  type ProjectDebtRow,
  type ProjectSummary,
  toBalanceText,
  toLatestSettledText,
  toProjectSummaryVM,
} from '@/ui/features/project/viewmodels/projectDetail.vm';
import { getTaskErrorMessage } from '@/ui/hooks/getErrorMessage';
import { celebrate, notifyFailed } from '@/ui/hooks/notify';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { formatCurrency } from '@/ui/utils';

interface UseProjectDetailPageArgs {
  /** 清單頁傳入已載入的資料，路由進入時為 undefined。 */
  project?: Project;
}

type ProjectFetchState = 'loading' | 'loaded' | 'notFound' | 'error';

export const useProjectDetailPage = ({ project }: UseProjectDetailPageArgs) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';
  const { confirm } = useConfirm();

  const {
    monthGroups,
    totals,
    balance,
    lastSettledYearMonth,
    hasMore,
    loadMore,
    loading: viewLoading,
    balanceLoading,
    balanceError,
    error: viewError,
    reload,
    retryBalance,
  } = useProjectDetailView(householdId, id || '');

  const { updateProject, deleteProject } = useProjectCmds(householdId);
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
      // A failed load is UNKNOWN, not absent (ADR-0072): offer retry, not not-found.
      setFetchedProject(null);
      setFetchState('error');
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
      const result = await updateProject(activeProject.id, { name });
      if (!result.ok) {
        notifyFailed(getTaskErrorMessage(result, PROJECT_DETAIL_LABELS.RENAME_FAILED));
        return;
      }
      setNameOverride(name);
    },
    [activeProject, updateProject],
  );

  const handleToggleActive = useCallback(async () => {
    if (!activeProject) return;
    const nextActive = !isActive;
    const result = await updateProject(activeProject.id, { isActive: nextActive });
    if (!result.ok) {
      notifyFailed(getTaskErrorMessage(result, PROJECT_DETAIL_LABELS.UPDATE_FAILED));
      return;
    }
    setStatusOverride(nextActive);
  }, [activeProject, isActive, updateProject]);

  const summary = useMemo<ProjectSummary>(() => toProjectSummaryVM(totals), [totals]);

  const balanceText = useMemo(() => toBalanceText(balance), [balance]);
  const latestSettledText = useMemo(
    () => toLatestSettledText(lastSettledYearMonth),
    [lastSettledYearMonth],
  );

  const handleDelete = useCallback(async () => {
    if (!activeProject) return;
    const confirmed = await confirm({
      title: PROJECT_DANGER_LABELS.DELETE_TITLE,
      consequence: PROJECT_DANGER_LABELS.DELETE_CONSEQUENCE,
      confirmLabel: PROJECT_DANGER_LABELS.CONFIRM,
    });
    if (!confirmed) return;
    const task = await deleteProject(activeProject.id);
    if (!task.ok) {
      notifyFailed(getTaskErrorMessage(task, PROJECT_DANGER_LABELS.DELETE_FAILED));
      return;
    }
    celebrate();
    navigate('/projects');
  }, [activeProject, confirm, deleteProject, navigate]);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadProject(), reload()]);
  }, [loadProject, reload]);

  const notFound = fetchState === 'notFound';
  const error = viewError ?? (fetchState === 'error' ? PROJECT_DETAIL_LABELS.LOAD_ERROR : null);

  return {
    projectId: id,
    activeProject,
    projectDebt,
    isActive,
    monthGroups,
    summary,
    balance,
    balanceText,
    latestSettledText,
    hasMore,
    loadMore,
    loading: fetchState === 'loading' || viewLoading,
    balanceLoading,
    balanceError,
    error,
    notFound,
    reload: reloadAll,
    retryBalance,
    handleRename,
    handleToggleActive,
    handleDelete,
  };
};

export type ProjectDetailPageController = ReturnType<typeof useProjectDetailPage>;
