import { useRecordForm } from '@/components/records/form/useRecordForm';
import { TypeToggle } from '@/components/records/form/TypeToggle';
import { AllocationSection } from '@/components/records/form/AllocationSection';
import { RecordBasicFields } from '@/components/records/form/RecordBasicFields';
import { ProjectSelection } from '@/components/records/form/ProjectSelection';
import { AllocationButton } from '@/components/records/form/AllocationButton';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TransferSettings } from '@/components/records/form/TransferSettings';
import { type Record } from '@/domains/record/types';
import { RecordFormType } from '@/domains/record/types';

interface RecordFormContentProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record) => Promise<void>;
  onSuccess?: () => void;
  initialData?: Record;
  householdId: string;
}

export const RecordFormContent: React.FC<RecordFormContentProps> = (props) => {
  const { onClose, onSubmit, onSuccess, initialData, householdId } = props;

  const {
    loading,
    error,
    isEditing,
    projects,
    save,
    formData,
    formChanged,
    showAllocations,
    setShowAllocations,
    totalPercentage,
  } = useRecordForm({ onSubmit, onClose, onSuccess, initialData, householdId });

  return (
    <>
      <form onSubmit={save} className="space-y-4 py-4">
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
        )}

        {/* Type Toggle */}
        {!isEditing && <TypeToggle type={formData.formType} onChanged={formChanged} />}

        <RecordBasicFields
          type={formData.formType}
          amount={formData.amount}
          category={formData.category}
          date={formData.date}
          description={formData.description}
          onChanged={formChanged}
        />

        {/* Transfer: From/To Project Selection */}
        {formData.formType === RecordFormType.TRANSFER && (
          <TransferSettings
            fromProjectId={formData.fromProjectId}
            setFromProjectId={formChanged}
            toProjectId={formData.toProjectId}
            setToProjectId={formChanged}
            projects={projects}
          />
        )}

        {/* Project Selection (Expense or Income without Allocations) */}
        {(formData.formType === RecordFormType.EXPENSE ||
          (formData.formType === RecordFormType.INCOME && !showAllocations)) && (
          <ProjectSelection
            projectId={formData.projectId}
            onChange={(projectId: string) => formChanged('projectId', projectId)}
            projects={projects}
          />
        )}

        {/* Allocate Button (Income Only) */}
        {formData.formType === RecordFormType.INCOME && !isEditing && (
          <AllocationButton
            showAllocations={showAllocations}
            setShowAllocations={setShowAllocations}
          />
        )}

        {/* Allocations Section */}
        {(showAllocations || isEditing) && formData.formType === RecordFormType.INCOME && (
          <AllocationSection
            projects={projects}
            allocations={formData.allocations}
            amount={formData.amount}
            totalPercentage={totalPercentage}
            onChanged={formChanged}
          />
        )}
      </form>

      {/* Actions */}
      <DialogFooter className="border-t pt-6">
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? '儲存中...' : '儲存'}
        </Button>
      </DialogFooter>
    </>
  );
};
