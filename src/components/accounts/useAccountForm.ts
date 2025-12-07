import { toAccount } from '@/domains/account/mappers/toAccount';
import { toAccountForm } from '@/domains/account/mappers/toAccountForm';
import type { Account, AccountFormData } from '@/domains/account/types';
import { validate } from '@/domains/account/validator';
import type { AccountArgs } from '@/hooks/pages/useAccountPage';
import { useEffect, useState } from 'react';

export const useAccountForm = (
  initialData?: Account,
  onSubmit?: (args: AccountArgs) => Promise<void>,
  onClose?: () => void,
  isOpen?: boolean,
) => {
  const [formData, setFormData] = useState<AccountFormData>(toAccountForm(initialData));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData(toAccountForm(initialData));
    }
  }, [isOpen, initialData]);

  const save = async () => {
    if (!formData) return;

    const validation = validate(formData);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }
    setError('');

    setLoading(true);
    try {
      await onSubmit?.({ account: toAccount(formData), accountId: initialData?.id });

      // Reset form
      setFormData(toAccountForm());
      onClose?.();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (data: Partial<AccountFormData>) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, ...data };
    });
  };

  return {
    loading,
    error,
    formData,
    save,
    updateFormData,
  };
};
