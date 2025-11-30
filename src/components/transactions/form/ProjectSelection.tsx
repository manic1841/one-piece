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
}

export const ProjectSelection: React.FC<ProjectSelectionProps> = ({
  projectId,
  setProjectId,
  projects,
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="project">Project</Label>
      <Select value={projectId} onValueChange={setProjectId} required>
        <SelectTrigger id="project">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.icon} {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {projects.length === 0 && (
        <p className="text-xs text-destructive">
          No projects found. Please create a project in Settings first.
        </p>
      )}
    </div>
  );
};
