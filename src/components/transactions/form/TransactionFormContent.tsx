import React, { useState, useEffect } from 'react';
import { useTransactionForm } from './hooks/useTransactionForm';
import { TypeToggle } from './TypeToggle';
import { AllocationSection } from './AllocationSection';
import { TransactionBasicFields } from './TransactionBasicFields';
import { ProjectSelection } from './ProjectSelection';
import { AllocationButton } from './AllocationButton';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TransferSettings } from './TransferSettings';
import { useProjectsNew } from '@/hooks/useProjects';
import { type UnifiedRecord, normalizeRecord } from './types/unifiedRecord';
import { FormType } from './types/formType';

interface TransactionFormContentProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UnifiedRecord) => Promise<void>;
  onSuccess?: () => void;
  initialData?: UnifiedRecord;
  householdId: string;
  userEmail: string;
}

export const TransactionFormContent: React.FC<TransactionFormContentProps> = (props) => {
  const { onClose, isOpen } = props;
  const [showAllocations, setShowAllocations] = useState(false);
  const loading = false;
  const error = '';
  const initialData = props.initialData ? props.initialData : normalizeRecord();
  const [formData, setFormData] = useState(initialData);
  const isEditing = !!initialData;

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleFormChanged = <K extends keyof UnifiedRecord>(name: K, value: UnifiedRecord[K]) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const { handleSubmit } = useTransactionForm({ ...props, formData, setFormData, showAllocations });
  const { projects } = useProjectsNew(props.householdId, isOpen);

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
        )}

        {/* Type Toggle */}
        {!isEditing && <TypeToggle type={formData.formType} onChanged={handleFormChanged} />}

        <TransactionBasicFields
          type={formData.formType}
          amount={formData.amount.toString()}
          category={formData.category}
          date={formData.date.toDateString()}
          description={formData.description}
          onChanged={handleFormChanged}
        />

        {/* Transfer: From/To Project Selection */}
        {formData.formType === FormType.transfer && (
          <TransferSettings
            fromProjectId={formData.sourceProjectId || ''}
            setFromProjectId={handleFormChanged}
            toProjectId={formData.mainProjectId || ''}
            setToProjectId={handleFormChanged}
            projects={projects}
          />
        )}

        {/* Project Selection (Expense or Income without Allocations) */}
        {(formData.formType === FormType.expense ||
          (formData.formType === FormType.income && !showAllocations)) && (
          <ProjectSelection
            projectId={formData.mainProjectId || ''}
            setProjectId={(id: string) => {
              handleFormChanged('mainProjectId', id);
            }}
            projects={projects}
          />
        )}

        {/* Allocate Button (Income Only) */}
        {formData.formType === FormType.income && !isEditing && (
          <AllocationButton
            showAllocations={showAllocations}
            setShowAllocations={setShowAllocations}
          />
        )}

        {/* Allocations Section */}
        {(showAllocations || isEditing) && formData.formType === FormType.income && (
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
