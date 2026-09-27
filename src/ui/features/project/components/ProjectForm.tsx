import React from 'react';

import { Form } from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { ProjectFormFields } from '@/ui/features/project/components/form/ProjectFormFields';
import { useProjectForm } from '@/ui/features/project/hooks/useProjectForm';
import { type ProjectArgs } from '@/ui/features/project/hooks/useProjectPage';
import { type Project } from '@/ui/features/project/viewmodels/projectForm.vm';

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
  const { form, submit, error, isSubmitting } = useProjectForm(
    initialData,
    onSubmit,
    onClose,
    isOpen,
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{title || (initialData?.id ? 'Edit Project' : 'New Project')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-6 py-4">
            {/* Error Message */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Basic Information */}
            <ProjectFormFields />

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isSubmitting} type="button">
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '儲存中...' : '儲存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectForm;
