import { type Project } from '@/domains/project/types';
import { useLoadingTask } from '@/hooks/useLoadingTask';
import { projectService } from '@/services/projectService';
import { useCallback, useEffect, useState } from 'react';

export function useProjects(householdId?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const { loading, error, run } = useLoadingTask();

  const load = useCallback(async () => {
    run(async () => {
      if (!householdId) return;
      const data = await projectService.getProjects(householdId);
      setProjects(data);
    });
  }, [run, householdId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    projects,
    loading,
    error,
    reload: load,
  };
}
