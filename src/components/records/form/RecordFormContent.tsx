import { useRecordForm } from '@/components/records/form/useRecordForm';
import { TypeToggle } from '@/components/records/form/TypeToggle';
import { RecordBasicFields } from '@/components/records/form/RecordBasicFields';
import { ProjectSelection } from '@/components/records/form/ProjectSelection';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TransferSettings } from '@/components/records/form/TransferSettings';
import { type Record } from '@/domains/record/types';
import { RecordFormType } from '@/domains/record/types';
import { IncomeSection } from './IncomeSection';

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
    projectsLoading,
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
          formType={formData.formType}
          recordType={formData.recordType}
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
            loading={projectsLoading}
          />
        )}

        {/* Project Selection (Expense or Income without Allocations) */}
        {formData.formType === RecordFormType.EXPENSE && (
          <ProjectSelection
            projectId={formData.projectId}
            onChange={(projectId: string) => formChanged('projectId', projectId)}
            projects={projects}
            loading={projectsLoading}
          />
        )}

        {formData.formType === RecordFormType.INCOME && (
          <IncomeSection
            editing={isEditing}
            showAllocations={showAllocations}
            setShowAllocations={setShowAllocations}
            onChanged={formChanged}
            projects={projects}
            projectId={formData.projectId}
            projectsLoading={projectsLoading}
            allocations={formData.allocations}
            amount={formData.amount}
            totalPercentage={totalPercentage}
          />
        )}
      </form>

      {/* Actions */}
      <DialogFooter className="border-t pt-6">
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="submit" disabled={loading} onClick={save}>
          {loading ? '儲存中...' : '儲存'}
        </Button>
      </DialogFooter>
    </>
  );
};
