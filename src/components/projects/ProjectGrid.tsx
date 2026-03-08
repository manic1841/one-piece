import React from 'react';

import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';

import { ProjectCard } from '@/components/projects/ProjectCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Project } from '@/domains/project/types';

interface ProjectGridProps {
  householdId?: string;
  projects: Project[];
  loading: boolean;
  onSelect: (project: Project) => void;
  onEdit: (record: Project) => void;
  onDelete: (record: Project) => void;
  isReorderMode?: boolean;
  onMoveUp?: (projectId: string) => void;
  onMoveDown?: (projectId: string) => void;
}
export const ProjectGrid: React.FC<ProjectGridProps> = (props: ProjectGridProps) => {
  const {
    householdId,
    projects,
    loading,
    onSelect,
    onEdit,
    onDelete,
    isReorderMode,
    onMoveUp,
    onMoveDown,
  } = props;

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">Loading projects...</div>
        </CardContent>
      </Card>
    );
  }

  // No projects state
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            No projects found. Create projects in Settings to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Projects grid
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="relative group">
            <ProjectCard
              householdId={householdId}
              project={project}
              onClick={() => !isReorderMode && onSelect(project)}
            />
            {/* Action Buttons */}
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {isReorderMode ? (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveUp?.(project.id);
                    }}
                    title="Move Up"
                  >
                    <ArrowUp size={14} />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveDown?.(project.id);
                    }}
                    title="Move Down"
                  >
                    <ArrowDown size={14} />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(project);
                    }}
                    title="Edit project"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(project);
                    }}
                    title="Delete project"
                  >
                    <Trash2 size={14} />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
