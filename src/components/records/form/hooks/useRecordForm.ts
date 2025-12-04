import { useState } from 'react';
import { validateForm } from '@/domains/record/validator';
import { type Record, unifyRecord } from '@/domains/record/record';

interface UseRecordFormProps {
  onSubmit: (data: Record) => Promise<void>;
  onClose: () => void;
  onSuccess?: () => void;
  formData: Record;
  setFormData: (data: Record) => void;
  showAllocations: boolean;
}

export const useRecordForm = ({
  onSubmit,
  onClose,
  onSuccess,
  formData,
  setFormData,
  showAllocations,
}: UseRecordFormProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate amount
    const validation = validateForm(formData, showAllocations);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setLoading(true);

    onSubmit(formData);

    try {
      // Reset form
      setFormData(unifyRecord());

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
    handleSubmit,
  };
};
