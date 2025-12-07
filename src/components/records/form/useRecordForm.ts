import { buildRecord, toRecordFormData } from '@/domains/record/mappers/recordFormConverter';
import { type Record, type RecordFormData } from '@/domains/record/types';
import { validateForm } from '@/domains/record/validator';
import { useProjects } from '@/hooks/useProjects';
import { useEffect, useState } from 'react';

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
  const { projects, loading: projectsLoading } = useProjects(householdId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<RecordFormData>(toRecordFormData(initialData));
  const [showAllocations, setShowAllocations] = useState(formData.allocations.length > 0);
  const [totalPercentage, setTotalPercentage] = useState(0);

  const isEditing = !!initialData;

  const formChanged = <K extends keyof RecordFormData>(name: K, value: RecordFormData[K]) => {
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
    e.preventDefault();
    setError('');

    // Validate amount
    const validation = validateForm(formData, showAllocations);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setLoading(true);

    try {
      await onSubmit(buildRecord(formData, initialData));

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
