import { type Project, type ProjectCreate } from '@/domains/project/types';
import { useProjectCmds } from '@/hooks/useProjectCmds';
import { useProjects } from '@/hooks/useProjects';
import { useState } from 'react';

export interface ProjectArgs {
  project: ProjectCreate;
  id: string;
}

export const useProjectPage = (householdId?: string, email?: string) => {
  const { projects, loading, error, reload } = useProjects(householdId);
  const { createProject, updateProject, deleteProject } = useProjectCmds(
    householdId,
    email,
    reload,
  );

  const [editing, setEditing] = useState<Project | undefined>(undefined);
  const [isSettlementDialogOpen, setIsSettlementDialogOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);

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

  return {
    loading,
    error,
    projects,
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
  };
};
