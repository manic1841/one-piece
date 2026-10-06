import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  MemberFormSchema,
  type MemberFormVM,
  createDefaultMemberFormVM,
} from '../viewmodels/memberForm.vm';

interface UseMemberFormArgs {
  /** Adds the member; failures are surfaced by the parent controller. */
  onAdd: (email: string, role: string) => Promise<void>;
}

/**
 * Controller for the add-member form (ADR-0064 / §4). The Surface receives the
 * action as a prop; the form state lives here.
 */
export function useMemberForm({ onAdd }: UseMemberFormArgs) {
  const form = useForm<MemberFormVM>({
    resolver: zodResolver(MemberFormSchema),
    mode: 'onTouched',
    defaultValues: createDefaultMemberFormVM(),
  });

  const submit = form.handleSubmit(async (vm) => {
    const parsed = MemberFormSchema.parse(vm);
    try {
      await onAdd(parsed.email, parsed.role);
      form.reset(createDefaultMemberFormVM());
    } catch {
      // Error is surfaced by the parent controller.
    }
  });

  return {
    form,
    submit,
    isSubmitting: form.formState.isSubmitting,
  };
}
