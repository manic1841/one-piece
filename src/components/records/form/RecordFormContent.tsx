import React, { useState, useEffect } from 'react';
import { useRecordForm } from './hooks/useRecordForm';
import { TypeToggle } from './TypeToggle';
import { AllocationSection } from './AllocationSection';
import { RecordBasicFields } from './RecordBasicFields';
import { ProjectSelection } from './ProjectSelection';
import { AllocationButton } from './AllocationButton';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TransferSettings } from './TransferSettings';
import { useProjectsNew } from '@/hooks/useProjects';
import { type Record, unifyRecord } from '@/domains/record/record';
import { FormType } from '@/domains/record/formType';

interface RecordFormContentProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record) => Promise<void>;
  onSuccess?: () => void;
  initialData?: Record;
  householdId: string;
  userEmail: string;
}

export const RecordFormContent: React.FC<RecordFormContentProps> = (props) => {
  const { onClose, isOpen } = props;
  const [showAllocations, setShowAllocations] = useState(false);
  const loading = false;
  const error = '';
  const initialData = props.initialData ? props.initialData : unifyRecord();
  const [formData, setFormData] = useState(initialData);
  const isEditing = !!initialData;

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleFormChanged = <K extends keyof Record>(name: K, value: Record[K]) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const { handleSubmit } = useRecordForm({ ...props, formData, setFormData, showAllocations });
  const { projects } = useProjectsNew(props.householdId, isOpen);

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
        )}

        {/* Type Toggle */}
        {!isEditing && <TypeToggle type={formData.formType} onChanged={handleFormChanged} />}

        <RecordBasicFields
          type={formData.formType}
          amount={formData.amount.toString()}
          category={formData.category}
          date={formData.date.toDateString()}
          description={formData.description}
          onChanged={handleFormChanged}
        />

        {/* Transfer: From/To Project Selection */}
        {formData.formType === FormType.TRANSFER && (
          <TransferSettings
            fromProjectId={formData.sourceProjectId || ''}
            setFromProjectId={handleFormChanged}
            toProjectId={formData.mainProjectId || ''}
            setToProjectId={handleFormChanged}
            projects={projects}
          />
        )}

        {/* Project Selection (Expense or Income without Allocations) */}
        {(formData.formType === FormType.EXPENSE ||
          (formData.formType === FormType.INCOME && !showAllocations)) && (
          <ProjectSelection
            projectId={formData.mainProjectId || ''}
            setProjectId={(id: string) => {
              handleFormChanged('mainProjectId', id);
            }}
            projects={projects}
          />
        )}

        {/* Allocate Button (Income Only) */}
        {formData.formType === FormType.INCOME && !isEditing && (
          <AllocationButton
            showAllocations={showAllocations}
            setShowAllocations={setShowAllocations}
          />
        )}

        {/* Allocations Section */}
        {(showAllocations || isEditing) && formData.formType === FormType.INCOME && (
          <AllocationSection
            projects={projects}
            allocations={formData.allocations || []}
            amount={formData.amount.toString()}
            onChanged={(projectId: string, percentage: number) => {
              const allocations = formData.allocations || [];
              handleFormChanged(
                'allocations',
                allocations.map((a) => (a.projectId === projectId ? { ...a, percentage } : a)),
              );
            }}
          />
        )}
      </form>

      {/* Actions */}
      <DialogFooter className="border-t pt-6">
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="submit" onClick={handleSubmit} disabled={loading}>
          {loading ? '儲存中...' : '儲存'}
        </Button>
      </DialogFooter>
    </>
  );
};
