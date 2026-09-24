import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { type SelectFieldOption } from '@/ui/components/form';

import {
  type Account,
  AccountCategory,
  type Portfolio,
  type PortfolioFormInput,
  PortfolioFormSchema,
  type PortfolioFormVM,
  createDefaultPortfolioFormVM,
  mapPortfolioToFormVM,
} from '../viewmodels/portfolioForm.vm';

interface UsePortfolioFormParams {
  isOpen: boolean;
  /** The household's accounts; the page already loads them to label the list. */
  accounts: Account[];
  portfolio?: Portfolio;
  onSubmit: (data: PortfolioFormVM) => Promise<void>;
  onClose: () => void;
}

/**
 * Controller for the portfolio dialog (ADR-0064). Owns the RHF state and the
 * account options; the dialog only renders.
 *
 * The resolver drives field-level display (`onTouched`), and the explicit
 * `PortfolioFormSchema.parse` in the submit handler is the authoritative gate
 * before the caller's mapper and use case. A rejected submit surfaces through
 * RHF's root error channel, which `reset()` on open clears along with the
 * fields.
 */
export const usePortfolioForm = ({
  isOpen,
  accounts,
  portfolio,
  onSubmit,
  onClose,
}: UsePortfolioFormParams) => {
  const form = useForm<PortfolioFormInput, unknown, PortfolioFormVM>({
    resolver: zodResolver(PortfolioFormSchema),
    mode: 'onTouched',
    defaultValues: createDefaultPortfolioFormVM(),
  });

  // The dialog stays mounted behind `isOpen`, so the edit target is applied by
  // resetting rather than by seeding the defaults once.
  useEffect(() => {
    if (!isOpen) return;
    form.reset(portfolio ? mapPortfolioToFormVM(portfolio) : createDefaultPortfolioFormVM());
  }, [isOpen, portfolio, form]);

  const securitiesOptions = useMemo<SelectFieldOption[]>(
    () =>
      accounts
        .filter((account) => account.category === AccountCategory.SECURITIES)
        .map((account) => ({ value: account.id, label: account.name })),
    [accounts],
  );

  const bankOptions = useMemo<SelectFieldOption[]>(
    () =>
      accounts
        .filter(
          (account) =>
            account.category === AccountCategory.BANK || account.category === AccountCategory.CASH,
        )
        .map((account) => ({ value: account.id, label: `${account.name} (${account.category})` })),
    [accounts],
  );

  const submit = form.handleSubmit(async () => {
    try {
      const parsed = PortfolioFormSchema.parse(form.getValues());
      await onSubmit(parsed);
      onClose();
    } catch (err) {
      const message =
        err instanceof z.ZodError
          ? err.issues[0]?.message || '資料格式錯誤'
          : err instanceof Error
            ? err.message
            : '儲存投資組合失敗';
      form.setError('root', { message });
    }
  });

  return {
    form,
    submit,
    securitiesOptions,
    bankOptions,
    error: form.formState.errors.root?.message ?? null,
    isSubmitting: form.formState.isSubmitting,
  };
};
