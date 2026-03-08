import { Calendar, ListOrdered, Plus } from 'lucide-react';

// import ProjectBalanceChart from '@/components/projects/ProjectBalanceChart';
import ProjectDetailView from '@/components/projects/ProjectDetailView';
import ProjectForm from '@/components/projects/ProjectForm';
import { ProjectGrid } from '@/components/projects/ProjectGrid';
import SettlementDialog from '@/components/projects/SettlementDialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/useAuth';
import { useProjectPage } from '@/hooks/pages/useProjectPage';

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
    isSettlementDialogOpen,
    openSettleDialog,
    closeSettleDialog,
    unselectProject,
    selectedProject,
    selectProject,
    isReorderMode,
    toggleReorderMode,
    moveProjectUp,
    moveProjectDown,
    saveOrder,
  } = useProjectPage(userProfile?.householdId, userProfile?.email);

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
          {isReorderMode ? (
            <Button onClick={saveOrder} variant="default" className="gap-2">
              Save Order
            </Button>
          ) : (
            <Button onClick={toggleReorderMode} variant="outline" className="gap-2">
              <ListOrdered size={20} />
              Reorder
            </Button>
          )}
          {!isReorderMode && (
            <>
              <Button onClick={openSettleDialog} variant="outline" className="gap-2">
                <Calendar size={16} />
                Settlement
              </Button>
              <Button onClick={openForm} className="gap-2">
                <Plus size={16} />
                New Project
              </Button>
            </>
          )}
          {isReorderMode && (
            <Button onClick={toggleReorderMode} variant="ghost">
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Balance Trend Chart */}
      {/* {projects.length > 0 && (
        <ProjectBalanceChart
          householdId={userProfile?.householdId || ''}
          projects={projects.map((p) => ({
            id: p.id,
            name: p.name,
            icon: p.icon,
            color: p.color,
          }))}
        />
      )} */}

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

      {/* Monthly Settlement Dialog */}
      <SettlementDialog
        isOpen={isSettlementDialogOpen}
        onClose={closeSettleDialog}
        householdId={userProfile?.householdId || ''}
        email={userProfile?.email}
        projects={projects}
        onSuccess={reload}
      />
    </div>
  );
};

export default Projects;
