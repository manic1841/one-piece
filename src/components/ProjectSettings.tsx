import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { type Project } from '../schemas';
import { projectService } from '../services/projectService';
import ProjectFormModal from './projects/ProjectFormModal';

interface ProjectSettingsProps {
  householdId: string;
}

const ProjectSettings: React.FC<ProjectSettingsProps> = ({ householdId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState('');

  const loadProjects = useCallback(async () => {
    try {
      const data = await projectService.getProjects(householdId);
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSave = async (projectData: Partial<Project>) => {
    if (!projectData.name) return;

    try {
      if (projectData.id) {
        await projectService.updateProject(householdId, projectData.id, projectData);
      } else {
        await projectService.createProject(householdId, {
          name: projectData.name,
          icon: projectData.icon || '📁',
          color: projectData.color || 'bg-gray-100 text-gray-600',
          description: projectData.description || '',
          isPersonal: false,
          isActive: true,
          snapshots: [],
        });
      }
      await loadProjects();
      setIsFormOpen(false);
      setEditingProject(null);
    } catch (err) {
      console.error('Failed to save project:', err);
      setError('Failed to save project');
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This may affect historical data.'))
      return;

    try {
      await projectService.deleteProject(householdId, projectId);
      await loadProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError('Failed to delete project');
    }
  };

  if (loading) return <div className="text-gray-500">Loading projects...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Projects</h3>
          <p className="text-sm text-gray-600">Manage your budget categories and projects</p>
        </div>
        <button
          onClick={() => {
            setEditingProject({});
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus size={20} />
          Add Project
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-10 h-10 flex items-center justify-center rounded-lg ${project.color}`}
              >
                {project.icon}
              </span>
              <div>
                <h4 className="font-medium text-gray-900">{project.name}</h4>
                {project.description && (
                  <p className="text-xs text-gray-500">{project.description}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingProject(project);
                  setIsFormOpen(true);
                }}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDelete(project.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit/Create Modal */}
      <ProjectFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSave}
        initialData={editingProject}
      />
    </div>
  );
};

export default ProjectSettings;
