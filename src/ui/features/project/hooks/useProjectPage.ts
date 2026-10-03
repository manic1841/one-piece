import { useCallback, useEffect, useMemo, useState } from 'react';

import { type Project, type ProjectCreate } from '@/domains/project/schemas';
import {
  type ProjectRowVM,
  type ProjectSnapshotTotals,
  toProjectRows,
  toProjectSnapshotTotals,
} from '@/ui/features/project/viewmodels/projectPage.vm';
import { mergeReorderedIds } from '@/ui/utils/reorder';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

import { useProjectCmds } from './useProjectCmds';
import { useProjectQueries, useProjects } from './useProjects';

export interface ProjectArgs {
  project: ProjectCreate;
  id: string;
}

export const useProjectPage = (householdId?: string) => {
  const { projects, loading, error, reload } = useProjects(householdId || '');
  const { getProjectSnapshots } = useProjectQueries(householdId || '');
  const { createProject, updateProject, reorderProjects } = useProjectCmds(householdId || '');
  const { run } = useLoadingTask();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [totalsByProject, setTotalsByProject] = useState<Map<string, ProjectSnapshotTotals>>(
    new Map(),
  );

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  useEffect(() => {
    const controller = new AbortController();
    void run(
      async () => {
        if (!householdId || localProjects.length === 0) return [];
        return Promise.all(
          localProjects.map(async (project) => {
            const result = await getProjectSnapshots(project.id);
            return [project.id, toProjectSnapshotTotals(result.ok ? result.value : [])] as const;
          }),
        );
      },
      {
        signal: controller.signal,
        writeBack: (result) => {
          if (result.ok) setTotalsByProject(new Map(result.value));
        },
      },
    );
    return () => controller.abort();
  }, [householdId, localProjects, getProjectSnapshots, run]);

  const create = async ({ project }: ProjectArgs) => {
    await createProject(project);
    setIsFormOpen(false);
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
    () => toProjectRows(localProjects, totalsByProject),
    [localProjects, totalsByProject],
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
