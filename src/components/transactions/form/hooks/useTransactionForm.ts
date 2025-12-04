import { useState } from 'react';
import { validateForm } from '../helper/validator';
import { type UnifiedRecord } from '../types/unifiedRecord';
import { FormType } from '../types/formType';
import { normalizeRecord, convertToSchema, RecordType } from '../types/unifiedRecord';
import type { Transaction, PlannedIncome, ProjectTransaction } from '@/schemas';

interface UseTransactionFormProps {
  onSubmit: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  onSubmitPlannedIncome?: (plannedIncome: Omit<PlannedIncome, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateProjectTransaction?: (
    data: Omit<ProjectTransaction, 'id' | 'createdAt' | 'createdBy'>,
  ) => Promise<void>;
  onClose: () => void;
  onSuccess?: () => void;
  formData: UnifiedRecord;
  setFormData: (data: UnifiedRecord) => void;
  showAllocations: boolean;
}

export const useTransactionForm = ({
  onSubmit,
  onSubmitPlannedIncome,
  onUpdateProjectTransaction,
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

    if (formData.formType == FormType.expense) {
      const txn = convertToSchema(formData, RecordType.transaction) as Transaction;
      await onSubmit(txn);
    } else if (formData.formType == FormType.income && showAllocations) {
      const plannedIncome = convertToSchema(formData, RecordType.transaction) as PlannedIncome;
      await onSubmitPlannedIncome?.(plannedIncome);
    } else if (formData.formType == FormType.income && !showAllocations) {
      const txn = convertToSchema(formData, RecordType.transaction) as Transaction;
      await onSubmit?.(txn);
    } else if (formData.formType == FormType.transfer) {
      const projectTransaction = convertToSchema(
        formData,
        RecordType.transaction,
      ) as ProjectTransaction;
      await onUpdateProjectTransaction?.(projectTransaction);
    }

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
