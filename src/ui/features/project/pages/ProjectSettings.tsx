import React from 'react';

import { ArrowDown, ArrowLeft, ArrowUp, Save } from 'lucide-react';

import { type Project } from '@/domains/project/schemas';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { Label } from '@/ui/components/ui/label';
import { useProjectPage } from '@/ui/features/project/hooks/useProjectPage';
import { logger } from '@/utils/logger';

// Simple Toggle fallback since switch.tsx is missing in the project
const Switch = ({
  id,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-input'}`}
  >
    <span
      className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
    />
  </button>
);

interface ProjectSettingsProps {
  householdId: string;
  onBack: () => void;
}

const ProjectSettings: React.FC<ProjectSettingsProps> = ({ householdId, onBack }) => {
  const { projects, loading, moveProjectUp, moveProjectDown, saveOrder, update } =
    useProjectPage(householdId);

  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const handleSaveOrder = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveOrder();
    } catch (error) {
      logger.error('Failed to save project order', 'ProjectSettings', { error });
      setSaveError(error instanceof Error ? error.message : 'Failed to save project order.');
    } finally {
      setSaving(false);
    }
  };

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
          <p className="text-muted-foreground">Manage project order and status</p>
        </div>
        <Button variant="default" className="gap-2" onClick={handleSaveOrder} disabled={saving}>
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Order'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          {saveError && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {saveError}
            </div>
          )}
          <div className="space-y-4">
            {projects.map((project, index) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={index === 0}
                      onClick={() => moveProjectUp(project.id)}
                    >
                      <ArrowUp size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={index === projects.length - 1}
                      onClick={() => moveProjectDown(project.id)}
                    >
                      <ArrowDown size={16} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="w-10 h-10 flex items-center justify-center rounded-lg text-lg"
                      style={{ backgroundColor: project.color }}
                    >
                      {project.icon}
                    </span>
                    <div>
                      <p className="font-semibold">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.description || 'No description'}
                      </p>
                    </div>
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
