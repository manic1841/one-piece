import { useCallback, useMemo } from 'react';

import { useAuth } from '@/contexts/useAuth';
import { type ProjectCreate } from '@/domains/project/types';
import { projectService } from '@/services/projectService';

export const useProjectCmds = (
  householdId?: string,
  email?: string,
  reload?: () => Promise<void>,
) => {
  const { currentUser, isAdmin } = useAuth();
  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser, isAdmin],
  );

  const createProject = useCallback(
    async (project: ProjectCreate) => {
      if (!householdId || !email) return;
      await projectService.createProject(householdId, project, email, auth);
      await reload?.();
    },
    [householdId, email, reload, auth],
  );

  const updateProject = useCallback(
    async (id: string, project: ProjectCreate) => {
      if (!householdId || !email) return;
      await projectService.updateProject(householdId, id, project, email, auth);
      await reload?.();
    },
    [householdId, email, reload, auth],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      if (!householdId) return;
      await projectService.deleteProject(householdId, id, auth);
      await reload?.();
    },
    [householdId, reload, auth],
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
      await projectService.deleteSnapshot(householdId, projectId, snapshotId, auth);
      await reload?.();
    },
    [householdId, reload, auth],
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
