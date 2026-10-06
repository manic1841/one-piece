import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { SettingsWhitelistLabels } from '@/ui/constants/setting/settingsLabels';

import {
  EmailWhitelistFormSchema,
  type EmailWhitelistFormVM,
  createDefaultEmailWhitelistFormVM,
} from '../viewmodels/emailWhitelistForm.vm';

interface UseEmailWhitelistFormArgs {
  /** Adds the email; failures are surfaced by the parent controller. */
  onAdd: (email: string) => Promise<void>;
  /** Current whitelist, used for the duplicate guard. */
  whitelist: string[];
}

/**
 * Controller for the add-whitelist-email form (ADR-0064 / §4). Presence and
 * shape are field errors; a duplicate is a submit-time root error (it depends on
 * external state, not the field value alone).
 */
export function useEmailWhitelistForm({ onAdd, whitelist }: UseEmailWhitelistFormArgs) {
  const form = useForm<EmailWhitelistFormVM>({
    resolver: zodResolver(EmailWhitelistFormSchema),
    mode: 'onTouched',
    defaultValues: createDefaultEmailWhitelistFormVM(),
  });

  const submit = form.handleSubmit(async (vm) => {
    const parsed = EmailWhitelistFormSchema.parse(vm);

    form.clearErrors('root');
    if (whitelist.includes(parsed.email)) {
      form.setError('root', { message: SettingsWhitelistLabels.errorEmailDuplicate });
      return;
    }

    try {
      await onAdd(parsed.email);
      form.reset(createDefaultEmailWhitelistFormVM());
    } catch {
      // Error is surfaced by the parent controller.
    }
  });

  return {
    form,
    submit,
    error: form.formState.errors.root?.message ?? '',
    isSubmitting: form.formState.isSubmitting,
  };
}
