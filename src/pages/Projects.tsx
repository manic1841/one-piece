import React from 'react';
import { useAuth } from '../contexts/useAuth';
import { useProjects } from '../hooks/useProjects';
import { Plus } from 'lucide-react';
import ProjectCard from '../components/projects/ProjectCard';
import ProjectDetailView from '../components/projects/ProjectDetailView';
import ProjectFormModal from '../components/projects/ProjectFormModal';
import { formatCurrency } from '../utils/formatUtils';
import { projectService } from '../services/projectService';

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

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <div className="text-gray-500">Loading...</div>
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
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-2">View and manage your project balances</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      {/* Total Balance Card */}
      {projects.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Balance (All Projects)</h3>
          <p className={`text-3xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalBalance)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Across {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-500">
            No projects found. Create projects in Settings to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              balance={project.balance}
              onClick={() => setSelectedProject(project)}
            />
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
            isPersonal: false,
            isActive: true,
            snapshots: [],
          });
          await reloadData();
        }}
      />
    </div>
  );
};

export default Projects;
