import { toForm } from '@/domains/project/mappers/toForm';
import { toProject } from '@/domains/project/mappers/toProject';
import { type Project, type ProjectFormData } from '@/domains/project/types';
import { validate } from '@/domains/project/validator';
import { type ProjectArgs } from '@/hooks/pages/useProjectPage';
import { useCallback, useEffect, useState } from 'react';

export const useProjectForm = (
  initialData?: Project,
  onSubmit?: (args: ProjectArgs) => Promise<void>,
  onClose?: () => void,
  isOpen?: boolean,
) => {
  const [formData, setFormData] = useState<ProjectFormData | undefined>(toForm(initialData));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountingEnabled, setAccountingEnabled] = useState(
    initialData?.accounting?.enabled || false,
  );

  useEffect(() => {
    if (isOpen) {
      setFormData(toForm(initialData));
      setAccountingEnabled(initialData?.accounting?.enabled || false);
    }
  }, [isOpen, initialData]);

  const handleAccountingChange = useCallback((data: Partial<ProjectFormData>) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        accounting: {
          ...prev.accounting,
          enabled: prev.accounting?.enabled ?? false,
          ...data.accounting,
        },
      };
    });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    const validation = validate(formData);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    try {
      await onSubmit?.({ project: toProject(formData), id: initialData?.id || '' });
      setFormData(toForm());
      onClose?.();
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      setLoading(false);
    }
  };

  const accountingClick = (enabled: boolean) => {
    setAccountingEnabled(enabled);
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        accounting: {
          ...prev.accounting,
          enabled: enabled,
        },
      };
    });
  };

  const updateFormData = (data: Partial<ProjectFormData>) => {
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
    accountingClick,
    accountingEnabled,
    handleAccountingChange,
    updateFormData,
  };
};
