import { useCallback, useEffect, useState } from 'react';

import { getProjectBalanceUseCase } from '@/application/project/use_cases/getProjectBalanceUseCase';
import { getProjectWithSnapshotUseCase } from '@/application/project/use_cases/getProjectWithSnapshotUseCase';
import { listProjectRecordsUseCase } from '@/application/project/use_cases/listProjectRecordsUseCase';
import { listProjectSnapshotsUseCase } from '@/application/project/use_cases/listProjectSnapshotsUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { type Project, type ProjectWithSnapshot } from '@/domains/project/schemas';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useProjects(householdId?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const { loading, error, run } = useLoadingTask();

  const loadProjects = useCallback(async () => {
    if (!householdId) return;
    await run(async () => {
      const result = await listProjectsUseCase.execute({ householdId });
      setProjects(result);
    });
  }, [householdId, run]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    loading,
    error,
    projects,
    reload: loadProjects,
  };
}

export function useProjectDetail(
  householdId: string,
  projectId: string,
  year: number,
  month: number,
) {
  const [projectWithSnapshot, setProjectWithSnapshot] = useState<ProjectWithSnapshot | null>(null);
  const { loading, error, run } = useLoadingTask();

  const loadDetail = useCallback(async () => {
    if (!householdId || !projectId) return;
    await run(async () => {
      const result = await getProjectWithSnapshotUseCase.execute({
        householdId,
        projectId,
        year,
        month,
      });
      setProjectWithSnapshot(result);
    });
  }, [householdId, projectId, year, month, run]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  return {
    loading,
    error,
    project: projectWithSnapshot,
    reload: loadDetail,
  };
}

export function useProjectQueries(householdId: string) {
  const { run } = useLoadingTask();

  const getProjectBalance = useCallback(
    async (projectId: string) => {
      return run(async () => {
        return getProjectBalanceUseCase.execute({ householdId, projectId });
      });
    },
    [householdId, run],
  );

  const getProjectRecords = useCallback(
    async (projectId: string, yearMonth?: string) => {
      return run(async () => {
        return listProjectRecordsUseCase.execute({ householdId, projectId, yearMonth });
      });
    },
    [householdId, run],
  );

  const getProjectSnapshots = useCallback(
    async (projectId: string, yearMonth?: string) => {
      return run(async () => {
        return listProjectSnapshotsUseCase.execute({ householdId, projectId, yearMonth });
      });
    },
    [householdId, run],
  );

  return {
    getProjectBalance,
    getProjectRecords,
    getProjectSnapshots,
  };
}
