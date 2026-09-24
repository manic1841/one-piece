import { useCallback } from 'react';

import { createProjectUseCase } from '@/application/project/use_cases/createProjectUseCase';
import { deleteProjectSnapshotUseCase } from '@/application/project/use_cases/deleteProjectSnapshotUseCase';
import { deleteProjectUseCase } from '@/application/project/use_cases/deleteProjectUseCase';
import { recordProjectSnapshotUseCase } from '@/application/project/use_cases/recordProjectSnapshotUseCase';
import { reorderProjectsUseCase } from '@/application/project/use_cases/reorderProjectsUseCase';
import { updateProjectSnapshotUseCase } from '@/application/project/use_cases/updateProjectSnapshotUseCase';
import { updateProjectUseCase } from '@/application/project/use_cases/updateProjectUseCase';
import {
  type Project,
  type ProjectCreate,
  type ProjectSnapshot,
  type ProjectSnapshotCreate,
} from '@/domains/project/schemas';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export interface DeleteProjectSnapshotRequest {
  householdId: string;
  projectId: string;
  snapshotId: string;
}

export function useProjectCmds(householdId: string) {
  const auth = useAuthIdentity();

  const { loading, error, run } = useLoadingTask();

  const createProject = useCallback(
    async (data: ProjectCreate) => {
      return run(async () => {
        return createProjectUseCase.execute({
          householdId,
          data,
          userEmail: auth.email || '',
          auth,
        });
      });
    },
    [householdId, auth, run],
  );

  const updateProject = useCallback(
    async (projectId: string, updates: Partial<Project>) => {
      return run(async () => {
        await updateProjectUseCase.execute({
          householdId,
          projectId,
          updates,
          userEmail: auth.email || '',
          auth,
        });
        return true;
      });
    },
    [householdId, auth, run],
  );

  const recordSnapshot = useCallback(
    async (projectId: string, data: ProjectSnapshotCreate) => {
      return run(async () => {
        return recordProjectSnapshotUseCase.execute({
          householdId,
          projectId,
          data,
          userEmail: auth.email || '',
          auth,
        });
      });
    },
    [householdId, auth, run],
  );

  const updateSnapshot = useCallback(
    async (
      projectId: string,
      snapshotId: string,
      updates: Partial<ProjectSnapshot>,
    ) => {
      return run(async () => {
        return updateProjectSnapshotUseCase.execute({
          householdId,
          projectId,
          snapshotId,
          updates,
          userEmail: auth.email || '',
          auth,
        });
      });
    },
    [householdId, auth, run],
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      return run(async () => {
        return deleteProjectUseCase.execute({
          householdId,
          projectId,
          auth,
        });
      });
    },
    [householdId, auth, run],
  );

  const reorderProjects = useCallback(
    async (projectOrders: Array<{ id: string; order: number }>) => {
      return run(async () => {
        await reorderProjectsUseCase.execute({
          householdId,
          projectOrders,
          userEmail: auth.email || '',
          auth,
        });
        return true;
      });
    },
    [householdId, auth, run],
  );

  const deleteSnapshot = useCallback(
    async (_projectId: string, snapshotId: string) => {
      return run(async () => {
        return deleteProjectSnapshotUseCase.execute({
          householdId,
          projectId: _projectId,
          snapshotId,
          auth,
        });
      });
    },
    [householdId, auth, run],
  );

  return {
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    reorderProjects,
    recordSnapshot,
    updateSnapshot,
    deleteSnapshot,
  };
}
