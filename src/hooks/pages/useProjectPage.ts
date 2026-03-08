import { useEffect, useState } from 'react';

import { type Project, type ProjectCreate } from '@/domains/project/types';
import { useProjectCmds } from '@/hooks/useProjectCmds';
import { useProjects } from '@/hooks/useProjects';

export interface ProjectArgs {
  project: ProjectCreate;
  id: string;
}

export const useProjectPage = (householdId?: string, email?: string) => {
  const { projects, loading, error, reload } = useProjects(householdId);
  const [editing, setEditing] = useState<Project | undefined>(undefined);
  const [isSettlementDialogOpen, setIsSettlementDialogOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [localProjects, setLocalProjects] = useState<Project[]>([]);

  const { createProject, updateProject, deleteProject, reorderProjects } = useProjectCmds(
    householdId,
    email,
    reload,
  );

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  // create project
  const create = async ({ project }: ProjectArgs) => {
    await createProject(project);
  };

  // update project
  const update = async ({ id, project }: ProjectArgs) => {
    if (!editing) return;
    await updateProject(id, project);
    setEditing(undefined);
  };

  // edit project
  const editClick = (project: Project) => {
    setEditing(project);
    setIsFormOpen(true);
  };

  // delete project
  const deleteClick = (project: Project) => {
    if (
      !confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)
    ) {
      return;
    }
    deleteProject(project.id);
  };

  // select project
  const selectProject = (project: Project | undefined) => {
    setSelectedProject(project);
  };

  const unselectProject = () => {
    setSelectedProject(undefined);
  };

  // open form
  const openForm = () => {
    setIsFormOpen(true);
  };

  // close form
  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(undefined);
  };

  // open settlement dialog
  const openSettleDialog = () => {
    setIsSettlementDialogOpen(true);
  };

  // close settlement dialog
  const closeSettleDialog = () => {
    setIsSettlementDialogOpen(false);
  };

  const moveProjectUp = (projectId: string) => {
    const index = localProjects.findIndex((p) => p.id === projectId);
    if (index <= 0) return;

    const newProjects = [...localProjects];
    const temp = newProjects[index];
    newProjects[index] = newProjects[index - 1];
    newProjects[index - 1] = temp;
    setLocalProjects(newProjects);
  };

  const moveProjectDown = (projectId: string) => {
    const index = localProjects.findIndex((p) => p.id === projectId);
    if (index < 0 || index >= localProjects.length - 1) return;

    const newProjects = [...localProjects];
    const temp = newProjects[index];
    newProjects[index] = newProjects[index + 1];
    newProjects[index + 1] = temp;
    setLocalProjects(newProjects);
  };

  const saveOrder = async () => {
    const orders = localProjects.map((p, index) => ({
      id: p.id,
      order: index,
    }));
    await reorderProjects(orders);
    setIsReorderMode(false);
    reload();
  };

  return {
    loading,
    error,
    projects: localProjects,
    reload,
    create,
    update,
    editClick,
    deleteClick,
    editing,
    isFormOpen,
    openForm,
    closeForm,
    isSettlementDialogOpen,
    openSettleDialog,
    closeSettleDialog,
    selectedProject,
    setSelectedProject,
    selectProject,
    unselectProject,
    isReorderMode,
    toggleReorderMode: () => {
      if (isReorderMode) {
        setLocalProjects(projects);
      }
      setIsReorderMode(!isReorderMode);
    },
    moveProjectUp,
    moveProjectDown,
    saveOrder,
  };
};
