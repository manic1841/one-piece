import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Project } from '../../../schemas';

interface ProjectSelectionProps {
  projectId: string;
  setProjectId: (value: string) => void;
  projects: Project[];
  label?: string;
  excludeProjectId?: string; // For transfer: exclude source from destination options
  required?: boolean;
}

export const ProjectSelection: React.FC<ProjectSelectionProps> = ({
  projectId,
  setProjectId,
  projects,
  label = '專案',
  excludeProjectId,
  required = true,
}) => {
  const filteredProjects = excludeProjectId
    ? projects.filter((p) => p.id !== excludeProjectId)
    : projects;

  return (
    <div className="space-y-2">
      <Label htmlFor="project">{label}</Label>
      <Select value={projectId} onValueChange={setProjectId} required={required}>
        <SelectTrigger id="project">
          <SelectValue placeholder="選擇專案" />
        </SelectTrigger>
        <SelectContent>
          {filteredProjects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.icon} {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {projects.length === 0 && (
        <p className="text-xs text-destructive">
          找不到專案，請先在設定中建立專案
        </p>
      )}
    </div>
  );
};
