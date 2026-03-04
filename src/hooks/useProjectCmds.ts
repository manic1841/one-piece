import { useCallback } from 'react';

import { type ProjectCreate } from '@/domains/project/types';
import { projectService } from '@/services/projectService';

export const useProjectCmds = (
  householdId?: string,
  email?: string,
  reload?: () => Promise<void>,
) => {
  const createProject = useCallback(
    async (project: ProjectCreate) => {
      if (!householdId || !email) return;
      await projectService.createProject(householdId, project, email);
      await reload?.();
    },
    [householdId, email, reload],
  );

  const updateProject = useCallback(
    async (id: string, project: ProjectCreate) => {
      if (!householdId || !email) return;
      await projectService.updateProject(householdId, id, project, email);
      await reload?.();
    },
    [householdId, email, reload],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      if (!householdId) return;
      await projectService.deleteProject(householdId, id);
      await reload?.();
    },
    [householdId, reload],
  );

  // get records
  const getRecords = useCallback(
    async (projectId: string) => {
      if (!householdId) return;
      const data = await projectService.getRecords(householdId, projectId);
      return data;
    },
    [householdId],
  );

  // get project balance
  const getProjectBalance = useCallback(
    async (projectId: string) => {
      if (!householdId) return;
      const data = await projectService.getProjectBalance(householdId, projectId);
      return data;
    },
    [householdId],
  );

  // get snapshots
  const getSnapshots = useCallback(
    async (projectId: string) => {
      if (!householdId) return;
      const data = await projectService.getSnapshots(householdId, projectId);
      return data;
    },
    [householdId],
  );

  const deleteSnapshot = useCallback(
    async (projectId: string, snapshotId: string) => {
      if (!householdId) return;
      await projectService.deleteSnapshot(householdId, projectId, snapshotId);
      await reload?.();
    },
    [householdId, reload],
  );

  return {
    createProject,
    updateProject,
    deleteProject,
    getRecords,
    getProjectBalance,
    getSnapshots,
    deleteSnapshot,
  };
};
