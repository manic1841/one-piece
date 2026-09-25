import { useCallback, useEffect, useState } from 'react';

import { type Project, type ProjectCreate } from '@/domains/project/schemas';

import { useProjectCmds } from './useProjectCmds';
import { useProjects } from './useProjects';

export interface ProjectArgs {
  project: ProjectCreate;
  id: string;
}

export const useProjectPage = (householdId?: string) => {
  const { projects, loading, error, reload } = useProjects(householdId || '');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [localProjects, setLocalProjects] = useState<Project[]>([]);

  const { createProject, updateProject, reorderProjects } = useProjectCmds(householdId || '');

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  // create project
  const create = async ({ project }: ProjectArgs) => {
    await createProject(project);
    setIsFormOpen(false);
  };

  // update project
  const update = async ({ id, project }: { id: string; project: Partial<ProjectCreate> }) => {
    await updateProject(id, project);
    setIsFormOpen(false);
    reload();
  };

  // open form
  const openForm = () => {
    setIsFormOpen(true);
  };

  // close form
  const closeForm = () => {
    setIsFormOpen(false);
  };

  const handleReorder = useCallback(
    (ordered: Project[]) => {
      const baseIds = new Set(localProjects.map((project) => project.id));
      if (
        ordered.length !== localProjects.length ||
        !ordered.every((project) => baseIds.has(project.id))
      ) {
        return;
      }

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
    projects: localProjects,
    reload,
    create,
    update,
    isFormOpen,
    openForm,
    closeForm,
    handleReorder,
    showInactive,
    toggleShowInactive: () => setShowInactive((prev) => !prev),
  };
};
