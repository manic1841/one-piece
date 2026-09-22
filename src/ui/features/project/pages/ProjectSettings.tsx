import React from 'react';

import { ArrowLeft } from 'lucide-react';

import { type Project } from '@/domains/project/schemas';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { Label } from '@/ui/components/ui/label';
import { Switch } from '@/ui/components/ui/switch';
import { useProjectPage } from '@/ui/features/project/hooks/useProjectPage';

interface ProjectSettingsProps {
  householdId: string;
  onBack: () => void;
}

const ProjectSettings: React.FC<ProjectSettingsProps> = ({ householdId, onBack }) => {
  const { projects, loading, update } = useProjectPage(householdId);

  const handleToggleActive = async (project: Project, active: boolean) => {
    await update({
      id: project.id,
      project: {
        ...project,
        isActive: active,
      },
    });
  };

  if (loading && projects.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">Loading projects...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Project Settings</h1>
          <p className="text-muted-foreground">Manage project status</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold">{project.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`active-${project.id}`}
                      checked={project.isActive}
                      onCheckedChange={(checked) => handleToggleActive(project, checked)}
                    />
                    <Label htmlFor={`active-${project.id}`} className="text-sm">
                      {project.isActive ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectSettings;
