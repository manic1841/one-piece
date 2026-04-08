import { ArrowRightLeft, Calendar, Plus, Settings } from 'lucide-react';

import { useAuth } from '@/infra/contexts/useAuth';
import { Button } from '@/ui/components/ui/button';
import ProjectDetailView from '@/ui/features/project/components/ProjectDetailView';
import ProjectForm from '@/ui/features/project/components/ProjectForm';
import { ProjectGrid } from '@/ui/features/project/components/ProjectGrid';
import ProjectTransfer from '@/ui/features/project/components/ProjectTransfer';
import { useProjectPage } from '@/ui/features/project/hooks/useProjectPage';
import MonthlySettlement from '@/ui/features/project/pages/MonthlySettlement';
import ProjectSettings from '@/ui/features/project/pages/ProjectSettings';

const Projects: React.FC = () => {
  const { userProfile } = useAuth();

  const {
    loading,
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
    isMonthlySettlementView,
    openMonthlySettlement,
    closeMonthlySettlement,
    isTransferDialogOpen,
    openTransferDialog,
    closeTransferDialog,
    selectedProject,
    selectProject,
    unselectProject,
    isReorderMode,
    moveProjectUp,
    moveProjectDown,
    isSettingsOpen,
    openSettings,
    closeSettings,
  } = useProjectPage(userProfile?.householdId);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Detail view for selected project
  if (selectedProject) {
    return (
      <ProjectDetailView
        householdId={userProfile?.householdId}
        project={selectedProject}
        onBack={unselectProject}
      />
    );
  }

  // Settings view
  if (isSettingsOpen) {
    return <ProjectSettings householdId={userProfile?.householdId || ''} onBack={closeSettings} />;
  }

  // Monthly Settlement view
  if (isMonthlySettlementView) {
    return (
      <MonthlySettlement
        householdId={userProfile?.householdId || ''}
        userEmail={userProfile?.email || ''}
        projects={projects.filter((p) => p.isActive)}
        onBack={closeMonthlySettlement}
        onSuccess={reload}
      />
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-2">View and manage your project balances</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={openSettings} variant="outline" className="gap-2">
            <Settings size={18} />
            Settings
          </Button>
          <Button onClick={openTransferDialog} variant="outline" className="gap-2">
            <ArrowRightLeft size={16} />
            Transfer
          </Button>
          <Button onClick={openMonthlySettlement} variant="outline" className="gap-2">
            <Calendar size={16} />
            Settlement
          </Button>
          <Button onClick={openForm} className="gap-2">
            <Plus size={16} />
            New Project
          </Button>
        </div>
      </div>

      <ProjectGrid
        householdId={userProfile?.householdId}
        projects={projects}
        loading={loading}
        onSelect={selectProject}
        onEdit={editClick}
        onDelete={deleteClick}
        isReorderMode={isReorderMode}
        onMoveUp={moveProjectUp}
        onMoveDown={moveProjectDown}
      />

      {/* Create Project Modal */}
      <ProjectForm
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={editing ? update : create}
        initialData={editing}
      />

      {/* Project Transfer Dialog */}
      <ProjectTransfer
        isOpen={isTransferDialogOpen}
        onClose={closeTransferDialog}
        householdId={userProfile?.householdId || ''}
        userEmail={userProfile?.email || ''}
        projects={projects}
        onSuccess={reload}
      />
    </div>
  );
};

export default Projects;
