import { useState } from 'react';
import { validateForm } from './validator';
import { type UnifiedRecord } from './types';
import { normalizeRecord } from './types';

interface UseTransactionFormProps {
  formData: UnifiedRecord;
  setFormData: (data: UnifiedRecord) => void;
  onClose: () => void;
  onSuccess?: () => void;
}

export const useTransactionForm = ({
  formData,
  setFormData,
  onClose,
  onSuccess,
}: UseTransactionFormProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate amount
    const validation = validateForm(formData);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setLoading(true);

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
