import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { createCustomLedgerCodeUseCase } from '@/application/ledger/use_cases/createCustomLedgerCodeUseCase';
import {
  type LedgerCodeCandidate,
  type LedgerCodeViolation,
  depthTwoCodesOfType,
  validateNewLedgerCode,
} from '@/domains/ledger/ledgerCodeRules';
import { SettingsLedgerCodeViolationMessages } from '@/ui/constants/setting/settingsLabels';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import {
  LedgerCodeFormSchema,
  type LedgerCodeFormVM,
  createDefaultLedgerCodeFormVM,
} from '../viewmodels/ledgerCodeForm.vm';

/** Maps a domain violation to the message shown as the form root error. */
const describeViolation = (
  violation: LedgerCodeViolation,
  code: string,
  candidates: LedgerCodeCandidate[],
): string => {
  const type = code.split(':')[0];
  const parent = code.split(':').slice(0, 2).join(':');

  switch (violation) {
    case 'INVALID_SHAPE':
      return SettingsLedgerCodeViolationMessages.invalidShape;
    case 'UNKNOWN_TYPE':
      return SettingsLedgerCodeViolationMessages.unknownType(type);
    case 'DUPLICATE':
      return SettingsLedgerCodeViolationMessages.duplicate(code);
    case 'PARENT_INACTIVE':
      return SettingsLedgerCodeViolationMessages.parentInactive(parent);
    case 'PARENT_MISSING':
      return SettingsLedgerCodeViolationMessages.parentMissing(
        parent,
        depthTwoCodesOfType(candidates, type),
      );
  }
};

interface UseLedgerCodeFormArgs {
  householdId?: string;
  userEmail?: string;
  candidates: LedgerCodeCandidate[];
  /** Reloads the code list after a successful create. */
  refresh: () => Promise<void>;
}

/**
 * Controller for the add-custom-ledger-code dialog (ADR-0064 / §4). The schema
 * owns shape presence; the domain rules remain the authority for the code itself
 * and surface as the form root error.
 */
export function useLedgerCodeForm({
  householdId,
  userEmail,
  candidates,
  refresh,
}: UseLedgerCodeFormArgs) {
  const auth = useAuthIdentity();

  const form = useForm<LedgerCodeFormVM>({
    resolver: zodResolver(LedgerCodeFormSchema),
    mode: 'onTouched',
    defaultValues: createDefaultLedgerCodeFormVM(),
  });
  const setRootError = (message: string) => form.setError('root', { message });

  /** @returns `true` when the code was created (the dialog may close); `false` on validation or write failure. */
  const submit = async (): Promise<boolean> => {
    let created = false;

    await form.handleSubmit(async (vm) => {
      if (!householdId || !userEmail) return;

      const parsed = LedgerCodeFormSchema.parse(vm);
      const code = `${parsed.type}:${parsed.code}`;
      const validation = validateNewLedgerCode(code, candidates);
      if (!validation.valid) {
        setRootError(describeViolation(validation.violation, code, candidates));
        return;
      }

      form.clearErrors('root');
      try {
        await createCustomLedgerCodeUseCase.execute({
          householdId,
          userEmail,
          auth,
          code,
          label: parsed.label,
        });
        form.reset({ type: parsed.type, code: '', label: '' });
        await refresh();
        created = true;
      } catch (err) {
        setRootError('新增失敗: ' + (err instanceof Error ? err.message : String(err)));
      }
    })();

    return created;
  };

  return {
    form,
    submit,
    error: form.formState.errors.root?.message ?? '',
    isSubmitting: form.formState.isSubmitting,
  };
}
