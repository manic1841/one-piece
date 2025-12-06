import { useEffect, useState } from 'react';

import { ProjectCategory } from '../../constants/project/projectLabel';
import { type Project } from '../../schemas';

export const useProjectForm = (
  initialData?: Project,
  householdId?: string,
  onSubmit?: (data: Project) => Promise<void>,
  onClose?: () => void,
  isOpen?: boolean,
) => {
  const [formData, setFormData] = useState<Partial<Project>>({
    category: ProjectCategory.OPERATING,
  });
  const [loading, setLoading] = useState(false);
  const [accountingEnabled, setAccountingEnabled] = useState(
    initialData?.accounting?.enabled || false,
  );

  useEffect(() => {
    if (isOpen) {
      setFormData({
        category: ProjectCategory.OPERATING,
        ...initialData,
      });
    }
  }, [isOpen, initialData]);

  const handleAccountingChange = (data: Partial<Project>) => {
    setFormData((prev) => ({
      ...prev,
      accounting: {
        enabled: prev.accounting?.enabled ?? false,
        ...prev.accounting,
        ...data.accounting,
      },
    }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      setLoading(false);
    }
  };

  const accountingClick = (enabled: boolean) => {
    setAccountingEnabled(enabled);
    setFormData((prev) => ({
        accounting: {
        enabled: enabled,
        ...prev.accounting,
        }}));
  };

  const accountingEnabled = formData.accounting?.enabled || false;

  return {
    loading,
    formData,
    save,
    accountingClick,
    accountingEnabled,
  };
};
