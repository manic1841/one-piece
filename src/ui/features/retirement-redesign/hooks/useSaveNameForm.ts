import { useCallback, useMemo } from 'react';

import { type Resolver, type ResolverResult, useForm } from 'react-hook-form';

import {
  EMPTY_SAVE_NAME_VM,
  type SaveNameVM,
  createSaveNameFormSchema,
  mapSaveNameVMToName,
} from '@/ui/features/retirement-redesign/viewmodels/saveName.vm';

export interface SaveNameSubmitOutcome {
  ok: boolean;
  messages?: string[];
}

/**
 * Owns a save dialog's form. The dialog only renders `form` and calls
 * `submit`; validation, trimming and failure messages never leave the
 * controller.
 */
export function useSaveNameForm(requiredMessage: string) {
  const schema = useMemo(() => createSaveNameFormSchema(requiredMessage), [requiredMessage]);

  const resolver = useCallback<Resolver<SaveNameVM>>(
    (values): ResolverResult<SaveNameVM> => {
      const parsed = schema.safeParse(values);
      if (parsed.success) return { values: parsed.data, errors: {} };

      const message = parsed.error.issues[0]?.message;
      return {
        values,
        errors: message === undefined ? {} : { name: { type: 'validation', message } },
      } as unknown as ResolverResult<SaveNameVM>;
    },
    [schema],
  );

  const form = useForm<SaveNameVM>({
    mode: 'onChange',
    defaultValues: EMPTY_SAVE_NAME_VM,
    resolver,
  });

  const submit = useCallback(
    (onSubmit: (name: string) => Promise<SaveNameSubmitOutcome>) =>
      form.handleSubmit(async (values) => {
        const outcome = await onSubmit(mapSaveNameVMToName(values));
        if (outcome.ok) return;
        form.setError('root', { message: (outcome.messages ?? []).join('\n') });
      })(),
    [form],
  );

  return { form, submit };
}
