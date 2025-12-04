import { useState } from 'react';
import { validateForm } from '../helper/validator';
import { type UnifiedRecord } from '../types/unifiedRecord';
import { normalizeRecord } from '../types/unifiedRecord';

interface UseTransactionFormProps {
  onSubmit: (data: UnifiedRecord) => Promise<void>;
  onClose: () => void;
  onSuccess?: () => void;
  formData: UnifiedRecord;
  setFormData: (data: UnifiedRecord) => void;
  showAllocations: boolean;
}

export const useTransactionForm = ({
  onSubmit,
  onClose,
  onSuccess,
  formData,
  setFormData,
  showAllocations,
}: UseTransactionFormProps) => {
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
      setFormData(normalizeRecord());

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
