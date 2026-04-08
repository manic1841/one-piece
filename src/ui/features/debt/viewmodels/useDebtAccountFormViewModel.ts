import { useCallback, useState } from 'react';

import { z } from 'zod';

import { type DebtAccount } from '@/domains/debt/schemas';
import { type Project } from '@/domains/project/schemas';
import { useDebtAccountCmds } from '@/ui/features/debt/hooks/useDebtAccountCmds';
import {
  type DebtAccountFormHook,
  type DebtFormValues,
  useDebtAccountForm,
} from '@/ui/features/debt/hooks/useDebtAccountForm';
import {
  mapDebtAccountVMToCreateMeta,
  mapDebtAccountVMToDomain,
  mapDebtFormZodErrorToFieldErrors,
  parseDebtAccountFormVM,
} from '@/ui/features/debt/viewmodels/debtAccountForm.vm';

export interface DebtAccountFormViewModel extends DebtAccountFormHook {
  projects: Project[];
  loading: boolean;
  error: string | null;
  submitLabel: string;
  submit: () => Promise<void>;
  cancel: () => void;
}

export interface UseDebtAccountFormViewModelProps {
  householdId: string;
  initialAccount?: DebtAccount;
  projects: Project[];
  submitLabel?: string;
  onSubmitSuccess: () => void;
  onCancel: () => void;
}

export const useDebtAccountFormViewModel = ({
  householdId,
  initialAccount,
  projects,
  submitLabel = '儲存',
  onSubmitSuccess,
  onCancel,
}: UseDebtAccountFormViewModelProps): DebtAccountFormViewModel => {
  const form = useDebtAccountForm(initialAccount);
  const {
    createDebtAccount,
    updateDebtAccount,
    loading: cmdLoading,
  } = useDebtAccountCmds(householdId);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setError(null);

    try {
      const vm = parseDebtAccountFormVM(form.values, form.isCreateMode);
      form.setValidationErrors({});
      const payload = mapDebtAccountVMToDomain(vm);

      if (!initialAccount) {
        const createMeta = mapDebtAccountVMToCreateMeta(vm);
        await createDebtAccount(payload, {
          disbursementDate: createMeta?.disbursementDate,
          disbursementDescription: createMeta?.disbursementDescription,
        });
      } else {
        // Edit mode
        await updateDebtAccount(initialAccount.id, payload);
      }
      onSubmitSuccess();
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        form.setValidationErrors(mapDebtFormZodErrorToFieldErrors<keyof DebtFormValues>(err));
        return;
      }
      setError(err instanceof Error ? err.message : '操作失敗');
    }
  }, [form, initialAccount, createDebtAccount, updateDebtAccount, onSubmitSuccess]);

  return {
    ...form,
    projects,
    loading: cmdLoading,
    error,
    submitLabel,
    submit,
    cancel: onCancel,
  };
};
