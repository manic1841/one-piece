import { useState, useCallback, useEffect } from 'react';
import { type Project, type ProjectCreate } from '@/domains/project/schemas';
import { ProjectCategory } from '@/domains/project/types/categories';
import { type ProjectArgs } from './useProjectPage';

export function useProjectFormContent(
  initialData: Project | undefined,
  onSubmit: (args: ProjectArgs) => Promise<void>,
  onClose: () => void,
  isOpen: boolean
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectCreate>({
    name: '',
    color: '#3B82F6',
    icon: '📊',
    order: 0,
    description: '',
    category: ProjectCategory.OPERATING,
    isActive: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          color: initialData.color,
          icon: initialData.icon,
          order: initialData.order,
          description: initialData.description || '',
          category: initialData.category,
          isActive: initialData.isActive,
        });
      } else {
        setFormData({
          name: '',
          color: '#3B82F6',
          icon: '📊',
          order: 0,
          description: '',
          category: ProjectCategory.OPERATING,
          isActive: true,
        });
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const updateFormData = useCallback((updates: Partial<ProjectCreate>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        id: initialData?.id || '',
        project: formData,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
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
