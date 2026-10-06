import React from 'react';

import { Form } from '@/ui/components/form';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { PROJECT_FORM_LABELS } from '@/ui/constants/project/projectFormLabels';
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
          <DialogTitle>
            {title ||
              (initialData?.id ? PROJECT_FORM_LABELS.EDIT_TITLE : PROJECT_FORM_LABELS.CREATE_TITLE)}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-6 py-4">
            {error && (
              <Alert variant="destructive" className="border-negative/20 bg-negative/10">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <ProjectFormFields />

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isSubmitting} type="button">
                {PROJECT_FORM_LABELS.CANCEL_ACTION}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? PROJECT_FORM_LABELS.SAVING_ACTION : PROJECT_FORM_LABELS.SAVE_ACTION}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectForm;
