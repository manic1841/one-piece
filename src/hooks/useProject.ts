import { useState, useEffect, useCallback } from 'react';
import { projectService } from '../services/projectService';
import { type Project } from '../schemas';
import { useLoadingTask } from './useLoadingTask';

export const useProject = (householdId: string, projectId: string) => {
  const { loading, error, run } = useLoadingTask();
  const [project, setProject] = useState<Project | null>(null);

  const loadProject = useCallback(
    async () =>
      run(async () => {
        const data = await projectService.getProjectById(householdId, projectId);
        setProject(data);
      }),
    [run, householdId, projectId],
  );

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  return {
    project,
    loading,
    error,
    reload: loadProject,
  };
};
