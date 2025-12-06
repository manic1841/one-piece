import { type Project } from '@/domains/project/types';
import { projectService } from '@/services/projectService';
import { useCallback } from 'react';

export const useProjectCmds = (
  householdId?: string,
  email?: string,
  reload?: () => Promise<void>,
) => {
  const createProject = useCallback(
    async (project: Project) => {
      if (!householdId || !email) return;
      await projectService.createProject(householdId, project, email);
      await reload?.();
    },
    [householdId, email, reload],
  );

  const updateProject = useCallback(
    async (project: Project) => {
      if (!householdId || !email || !project.id) return;
      await projectService.updateProject(householdId, project.id, project, email);
      await reload?.();
    },
    [householdId, email, reload],
  );

  const deleteProject = useCallback(
    async (project: Project) => {
      if (!householdId || !project.id) return;
      await projectService.deleteProject(householdId, project.id);
      await reload?.();
    },
    [householdId, reload],
  );

  // get latest snapshots
  const getLatestSnapshots = useCallback(
    async (projectId: string) => {
      if (!householdId) return;
      const data = await projectService.getLatestSnapshot(householdId, projectId);
      return data;
    },
    [householdId],
  );

  return { createProject, updateProject, deleteProject, getLatestSnapshots };
};
