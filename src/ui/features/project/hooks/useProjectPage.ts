import { useCallback, useEffect, useMemo, useState } from 'react';

import { listProjectBalancesUseCase } from '@/application/project/use_cases/listProjectBalancesUseCase';
import { type Project, type ProjectCreate } from '@/domains/project/schemas';
import { PROJECT_SETTLED_LABELS } from '@/ui/constants/project/projectDetailLabels';
import {
  type ProjectBalanceVM,
  type ProjectRowVM,
  toProjectRows,
} from '@/ui/features/project/viewmodels/projectPage.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { mergeReorderedIds } from '@/ui/utils/reorder';

import { useProjectCmds } from './useProjectCmds';
import { useProjects } from './useProjects';

export interface ProjectArgs {
  project: ProjectCreate;
  id: string;
}

export const useProjectPage = (householdId?: string) => {
  const { projects, loading, error, reload } = useProjects(householdId || '');
  const auth = useAuthIdentity();
  const { createProject, updateProject, reorderProjects } = useProjectCmds(householdId || '');
  const { run } = useLoadingTask();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [balances, setBalances] = useState<Map<string, ProjectBalanceVM>>(new Map());

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  useEffect(() => {
    const controller = new AbortController();
    void run(
      async () => {
        if (!householdId || localProjects.length === 0) return [];
        // One permission check and one batch call for the page; a failed row
        // keeps a null balance and renders a dash, the rest stand.
        const balances = await listProjectBalancesUseCase.execute({
          householdId,
          projectIds: localProjects.map((project) => project.id),
          auth,
        });
        return [...balances].map(
          ([projectId, entry]) =>
            [
              projectId,
              {
                balance: entry.balance,
                lastSettledYearMonth: entry.lastSettledYearMonth,
              },
            ] as const,
        );
      },
      {
        signal: controller.signal,
        writeBack: (result) => {
          if (result.ok) setBalances(new Map(result.value));
        },
      },
    );
    return () => controller.abort();
  }, [householdId, auth, localProjects, run]);

  const create = async ({ project }: ProjectArgs) => {
    const result = await createProject(project);
    setIsFormOpen(false);
    // The list is the source of the rows; without this the new project would
    // only appear after a manual refresh. Reload is a background refresh, so it
    // must not be awaited into the dialog's saving state.
    if (result.ok) void reload();
  };

  const update = async ({ id, project }: { id: string; project: Partial<ProjectCreate> }) => {
    await updateProject(id, project);
    setIsFormOpen(false);
    reload();
  };

  const openForm = () => {
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
  };

  const rows = useMemo(
    () => toProjectRows(localProjects, balances, PROJECT_SETTLED_LABELS.NEVER),
    [localProjects, balances],
  );
  const activeCount = useMemo(() => rows.filter((row) => row.isActive).length, [rows]);

  const reorderRows = useCallback(
    (orderedRows: ProjectRowVM[]) => {
      const projectById = new Map(localProjects.map((project) => [project.id, project]));
      if (!orderedRows.every((row) => projectById.has(row.id))) return;

      const mergedIds = mergeReorderedIds(
        localProjects.map((project) => project.id),
        orderedRows.map((row) => row.id),
      );
      const ordered = mergedIds
        .map((id) => projectById.get(id))
        .filter((project): project is Project => project !== undefined);

      setLocalProjects(ordered);
      void reorderProjects(
        ordered.map((project, index) => ({ id: project.id, order: index })),
      ).then(() => reload());
    },
    [localProjects, reorderProjects, reload],
  );

  return {
    loading,
    error,
    rows,
    activeCount,
    reload,
    create,
    update,
    isFormOpen,
    openForm,
    closeForm,
    showInactive,
    setShowInactive,
    reorderRows,
  };
};
