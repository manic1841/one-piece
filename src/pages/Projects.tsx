import React from 'react';
import { useAuth } from '../contexts/useAuth';
import { useProjects } from '../hooks/useProjects';
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import ProjectCard from '../components/projects/ProjectCard';
import ProjectDetailView from '../components/projects/ProjectDetailView';
import ProjectFormModal from '../components/projects/ProjectFormModal';
import MonthlySettlementDialog from '../components/projects/MonthlySettlementDialog';
import ProjectBalanceChart from '../components/projects/ProjectBalanceChart';
import { formatCurrency } from '../utils/formatUtils';
import { projectService } from '../services/projectService';
import { type Project, ProjectCategory } from '../schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Projects: React.FC = () => {
  const { userProfile } = useAuth();
  const {
    projects,
    loading,
    selectedProject,
    setSelectedProject,
    getProjectTransactions,
    reloadData,
  } = useProjects(userProfile?.householdId);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);
  const [isSettlementDialogOpen, setIsSettlementDialogOpen] = React.useState(false);

  const handleEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
  };

  const handleDelete = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userProfile?.householdId) return;

    if (
      !confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)
    ) {
      return;
    }

    try {
      await projectService.deleteProject(userProfile.householdId, project.id);
      await reloadData();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

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
    const projectWithBalance = projects.find((p) => p.id === selectedProject.id);
    const transactions = getProjectTransactions(selectedProject.id);

    return (
      <ProjectDetailView
        project={selectedProject}
        balance={projectWithBalance?.balance || 0}
        transactions={transactions}
        onBack={() => setSelectedProject(null)}
      />
    );
  }

  // Calculate total balance
  const totalBalance = projects.reduce((sum, project) => sum + project.balance, 0);
  const isPositive = totalBalance >= 0;

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
          <Button
            onClick={() => setIsSettlementDialogOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <Calendar size={16} />
            Monthly Settlement
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus size={16} />
            New Project
          </Button>
        </div>
      </div>

      {/* Total Balance Card */}
      {projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Balance (All Projects)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalBalance)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Across {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Balance Trend Chart */}
      {projects.length > 0 && (
        <ProjectBalanceChart
          householdId={userProfile?.householdId || ''}
          projects={projects.map((p) => ({
            id: p.id,
            name: p.name,
            icon: p.icon,
            color: p.color,
          }))}
        />
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No projects found. Create projects in Settings to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="relative group">
              <ProjectCard
                project={project}
                balance={project.balance}
                onClick={() => setSelectedProject(project)}
              />
              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => handleEdit(project, e)}
                  title="Edit project"
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => handleDelete(project, e)}
                  title="Delete project"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <ProjectFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={async (projectData) => {
          if (!userProfile?.householdId || !projectData.name) return;
          await projectService.createProject(userProfile.householdId, {
            name: projectData.name,
            icon: projectData.icon || '📁',
            color: projectData.color || 'bg-gray-100 text-gray-600',
            description: projectData.description || '',
            category: ProjectCategory.OPERATING,
            order: 0,
            isPersonal: false,
            isActive: true,
            createdBy: userProfile?.uid || 'unknown',
            snapshots: [],
          });
          await reloadData();
        }}
      />

      {/* Edit Project Modal */}
      <ProjectFormModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onSave={async (projectData) => {
          if (!userProfile?.householdId || !editingProject?.id || !projectData.name) return;
          await projectService.updateProject(
            userProfile.householdId,
            editingProject.id,
            projectData,
          );
          await reloadData();
          setEditingProject(null);
        }}
        initialData={editingProject || undefined}
      />

      {/* Monthly Settlement Dialog */}
      <MonthlySettlementDialog
        isOpen={isSettlementDialogOpen}
        onClose={() => setIsSettlementDialogOpen(false)}
        householdId={userProfile?.householdId || ''}
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          icon: p.icon,
          color: p.color,
        }))}
        onSuccess={async () => {
          await reloadData();
        }}
      />
    </div>
  );
};

export default Projects;
