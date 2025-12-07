import AccountingSettings from '@/components/projects/form/AccountingSettings';
import { ProjectFormFields } from '@/components/projects/form/ProjectFormFields';
import { useProjectForm } from '@/components/projects/form/useProjectForm';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { type Project } from '@/domains/project/types';
import { type ProjectArgs } from '@/hooks/pages/useProjectPage';
import React from 'react';

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
    save,
    accountingClick,
    accountingEnabled,
    handleAccountingChange,
    updateFormData,
  } = useProjectForm(initialData, onSubmit, onClose, isOpen);

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

          {/* Accounting Configuration */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="accounting-enabled"
                checked={accountingEnabled}
                onCheckedChange={accountingClick}
                disabled={loading}
              />
              <Label htmlFor="accounting-enabled" className="text-sm font-semibold cursor-pointer">
                啟用會計設定
              </Label>
            </div>

            {accountingEnabled && (
              <AccountingSettings data={formData} onChanged={handleAccountingChange} />
            )}
          </div>

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
