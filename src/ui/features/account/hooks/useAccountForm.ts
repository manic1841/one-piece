import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ACCOUNT_FORM_LABELS } from '@/ui/constants/account/formLabels';

import {
  AccountFormSchema,
  type AccountCreate,
  type AccountFormVM,
  createDefaultAccountFormVM,
  mapAccountVMToDomain,
} from '../viewmodels/account.vm';

/**
 * Controller for the account form (ADR-0064). Owns the RHF state; the dialog only
 * renders. The resolver drives field-level display (`onTouched`), and the explicit
 * `AccountFormSchema.parse` in the submit handler is the authoritative gate before
 * the mapper and use case.
 *
 * Non-field failures (e.g. the use case rejecting) surface through RHF's root
 * error channel, so `reset()` on open clears them along with the fields.
 */
export const useAccountForm = (
  onSubmit: (data: AccountCreate) => Promise<void>,
  onClose: () => void,
  isOpen: boolean,
) => {
  const form = useForm<AccountFormVM>({
    resolver: zodResolver(AccountFormSchema),
    mode: 'onTouched',
    defaultValues: createDefaultAccountFormVM(),
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(createDefaultAccountFormVM());
    }
  }, [isOpen, form]);

  const submit = form.handleSubmit(async () => {
    try {
      const parsed = AccountFormSchema.parse(form.getValues());
      await onSubmit(mapAccountVMToDomain(parsed));
      onClose();
    } catch (err) {
      const message =
        err instanceof z.ZodError
          ? err.issues[0]?.message || '資料格式錯誤'
          : err instanceof Error
            ? err.message
            : ACCOUNT_FORM_LABELS.SAVE_ERROR;
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
