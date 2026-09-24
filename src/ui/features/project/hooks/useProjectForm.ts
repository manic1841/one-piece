import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { type Project, type ProjectCreate } from '@/domains/project/schemas';

import {
  ProjectFormSchema,
  type ProjectFormVM,
  createDefaultProjectFormVM,
  mapProjectToFormVM,
  mapProjectVMToDomain,
} from '../viewmodels/projectForm.vm';
import { type ProjectArgs } from './useProjectPage';

/**
 * Controller for the project form (ADR-0064). Owns the RHF state; the dialog
 * only renders. The resolver drives field-level display (`onTouched`), and the
 * explicit `ProjectFormSchema.parse` in the submit handler is the authoritative
 * gate before the mapper and use case.
 *
 * Non-field failures (e.g. the use case rejecting) surface through RHF's root
 * error channel, so `reset()` on open clears them along with the fields.
 */
export const useProjectForm = (
  initialData: Project | undefined,
  onSubmit: (args: ProjectArgs) => Promise<void>,
  onClose: () => void,
  isOpen: boolean,
) => {
  const form = useForm<ProjectFormVM>({
    resolver: zodResolver(ProjectFormSchema),
    mode: 'onTouched',
    defaultValues: createDefaultProjectFormVM(),
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(initialData ? mapProjectToFormVM(initialData) : createDefaultProjectFormVM());
    }
  }, [isOpen, initialData, form]);

  const submit = form.handleSubmit(async () => {
    try {
      const parsed = ProjectFormSchema.parse(form.getValues());
      const domainData: ProjectCreate = mapProjectVMToDomain(parsed);
      await onSubmit({ id: initialData?.id || '', project: domainData });
      onClose();
    } catch (err) {
      const message =
        err instanceof z.ZodError
          ? err.issues[0]?.message || '資料格式錯誤'
          : err instanceof Error
            ? err.message
            : 'Failed to save project';
      form.setError('root', { message });
    }
  });

  return {
    form,
    submit,
    error: form.formState.errors.root?.message ?? null,
    isSubmitting: form.formState.isSubmitting,
  };
};
