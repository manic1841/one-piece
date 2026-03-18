import React from 'react';

import { type Project } from '@/domains/project/schemas';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { ProjectFormFields } from '@/ui/features/project/components/form/ProjectFormFields';
import { useProjectFormContent } from '@/ui/features/project/hooks/useProjectFormContent';
import { type ProjectArgs } from '@/ui/features/project/hooks/useProjectPage';

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (args: ProjectArgs) => Promise<void>;
  initialData?: Project;
  title?: string;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
}) => {
  const {
    loading,
    error,
    formData,
    updateFormData,
    save,
  } = useProjectFormContent(initialData, onSubmit, onClose, isOpen);

  if (!formData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{title || (initialData?.id ? 'Edit Project' : 'New Project')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-6 py-4">
          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
          )}

          {/* Basic Information */}
          <ProjectFormFields formData={formData} onChange={updateFormData} disabled={loading} />

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading} type="button">
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '儲存中...' : '儲存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectForm;
