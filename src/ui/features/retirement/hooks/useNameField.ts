import { useCallback, useState } from 'react';

import { type Resolver, type ResolverResult, useForm } from 'react-hook-form';
import { z } from 'zod';

import { NAME_FIELD_LABELS } from '@/ui/constants/retirement/validationLabels';

/** The one field these forms carry. */
export interface NameFieldVM {
  name: string;
}

export interface SaveNameOutcome {
  ok: boolean;
  messages?: string[];
}

const EMPTY_NAME_FIELD_VM: NameFieldVM = { name: '' };

/** Trimming happens here, so every caller receives an already-trimmed name. */
const NameFieldSchema = z.object({
  name: z.string().trim().min(1, NAME_FIELD_LABELS.REQUIRED),
});

/**
 * A single name field, for the plan form and every save dialog. It owns the
 * dialog's open state, seeds the value, trims and rejects blank input, and keeps
 * failure messages in the form's root — so callers only name the write.
 */
export function useNameField() {
  const [isOpen, setIsOpen] = useState(false);

  const resolver = useCallback<Resolver<NameFieldVM>>((values): ResolverResult<NameFieldVM> => {
    const parsed = NameFieldSchema.safeParse(values);
    if (parsed.success) return { values: parsed.data, errors: {} };

    const message = parsed.error.issues[0]?.message;
    return {
      values,
      errors: message === undefined ? {} : { name: { type: 'validation', message } },
    } as unknown as ResolverResult<NameFieldVM>;
  }, []);

  const field = useForm<NameFieldVM>({
    mode: 'onChange',
    defaultValues: EMPTY_NAME_FIELD_VM,
    resolver,
  });

  /** Put a name in the field without opening a dialog (the inline plan form). */
  const seed = useCallback((name: string) => field.reset({ name }), [field]);

  const open = useCallback(
    (initialName: string) => {
      seed(initialName);
      setIsOpen(true);
    },
    [seed],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    field.reset(EMPTY_NAME_FIELD_VM);
  }, [field]);

  const submit = useCallback(
    (save: (name: string) => Promise<SaveNameOutcome>, onSuccess?: () => void) => {
      // Blank input fails the resolver, so the callback never runs and the
      // settled value stays the neutral `ok: false`.
      let settled: SaveNameOutcome = { ok: false };

      return field
        .handleSubmit(async (values) => {
          settled = await save(values.name);
          if (settled.ok) {
            onSuccess?.();
            return;
          }
          field.setError('root', { message: (settled.messages ?? []).join('\n') });
        })()
        .then(() => settled);
    },
    [field],
  );

  return { field, isOpen, seed, open, close, submit };
}

/** The name field's form, as a component that only binds it receives it. */
export type NameFieldForm = ReturnType<typeof useNameField>['field'];
