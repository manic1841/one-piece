import { useCallback, useEffect, useState } from 'react';

import { z } from 'zod';

import { type Project, type ProjectCreate } from '@/domains/project/schemas';
import {
  type ProjectFormVM,
  createDefaultProjectFormVM,
  mapProjectToFormVM,
  mapProjectVMToDomain,
  parseProjectFormVM,
} from '@/ui/features/project/viewmodels/projectForm.vm';

import { type ProjectArgs } from './useProjectPage';

export function useProjectFormContent(
  initialData: Project | undefined,
  onSubmit: (args: ProjectArgs) => Promise<void>,
  onClose: () => void,
  isOpen: boolean,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectFormVM>(createDefaultProjectFormVM());

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(mapProjectToFormVM(initialData));
      } else {
        setFormData(createDefaultProjectFormVM());
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const updateFormData = useCallback((updates: Partial<ProjectFormVM>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const vm = parseProjectFormVM(formData);
      const domainData: ProjectCreate = mapProjectVMToDomain(vm);
      await onSubmit({
        id: initialData?.id || '',
        project: domainData,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0]?.message || '資料格式錯誤');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save project');
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    formData,
    updateFormData,
    save,
  };
}
