import { useEffect, useState } from 'react';
import { validateForm } from '@/domains/record/validator';
import { type Record, type RecordFormData } from '@/domains/record/types';
import { useProjectsNew } from '@/hooks/useProjects';
import { toRecordFormData, buildRecord } from '@/domains/record/mappers/recordFormConverter';

interface UseRecordFormProps {
  onSubmit: (data: Record) => Promise<void>;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: Record;
  householdId: string;
}

export const useRecordForm = ({
  onSubmit,
  onClose,
  onSuccess,
  initialData,
  householdId,
}: UseRecordFormProps) => {
  const { projects, loading: projectsLoading } = useProjectsNew(householdId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<RecordFormData>(toRecordFormData(initialData));
  const [showAllocations, setShowAllocations] = useState(formData.allocations.length > 0);
  const [totalPercentage, setTotalPercentage] = useState(0);

  const isEditing = !!initialData;

  const formChanged = <K extends keyof RecordFormData>(name: K, value: RecordFormData[K]) => {
    console.log(`Form changed: ${String(name)} =`, value);
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    const total = formData.allocations.reduce(
      (total, allocation) => total + parseFloat(allocation.percentage),
      0,
    );
    setTotalPercentage(total);
  }, [formData.allocations]);

  const save = async (e: React.FormEvent) => {
    console.log('Saving record with formData:', formData);
    e.preventDefault();
    setError('');

    // Validate amount
    const validation = validateForm(formData, showAllocations);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setLoading(true);

    onSubmit(buildRecord(formData, initialData));

    try {
      // Reset form
      setFormData(toRecordFormData());

      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      const error = err as Error;
      setError(error.message || '儲存失敗');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    isEditing,
    formData,
    setFormData,
    formChanged,
    showAllocations,
    setShowAllocations,
    projects,
    projectsLoading,
    save,
    totalPercentage,
  };
};
