import { zodResolver } from '@hookform/resolvers/zod';
import { type UseFormReturn, useForm, useWatch } from 'react-hook-form';

import { RetirementExpenseType } from '@/domains/retirement/schemas';
import type { RetirementExpenseCategory } from '@/domains/retirement/types';
import { RetirementExpenseDialogLabels } from '@/ui/constants/retirement/expenseDialogLabels';
import {
  type RetirementExpenseFormInput,
  type RetirementExpenseFormVM,
  RetirementExpenseFormVMSchema,
  buildRetirementExpenseFormInput,
  mapRetirementExpenseVMToDomain,
} from '@/ui/features/retirement/viewmodels/retirementForm.vm';
import { logger } from '@/utils/logger';

import {
  deriveRetirementDurationText,
  deriveRetirementGrowthText,
  useRetirementDialogForm,
} from './useRetirementDialogForm';

interface UseRetirementExpenseDialogOptions {
  initialData?: RetirementExpenseCategory;
  currentYear: number;
  planInflationRate: number;
  onSave: (expense: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
}

export interface RetirementExpenseDialogHook {
  open: boolean;
  setOpen: (value: boolean) => void;
  loading: boolean;
  /** The RHF form; the component binds fields through it. */
  form: UseFormReturn<RetirementExpenseFormInput, unknown, RetirementExpenseFormVM>;
  /** Debt-derived category: its annual is imported and read-only. */
  isDebtPayment: boolean;
  /** Derived readouts (previews), not RHF fields. */
  growthText: string;
  durationText: string;
  retirementYearPreview: string;
  handleSubmit: (event: React.FormEvent) => void;
}

/**
 * Controller for the expense dialog (ADR-0064). RHF owns the editable fields;
 * the retirement-year preview and the growth/duration readouts are derived here,
 * outside RHF. Submit runs the authoritative `Schema.parse` gate.
 */
export function useRetirementExpenseDialog({
  initialData,
  currentYear,
  planInflationRate,
  onSave,
}: UseRetirementExpenseDialogOptions): RetirementExpenseDialogHook {
  const initialForm = buildRetirementExpenseFormInput(initialData, currentYear);

  const form = useForm<RetirementExpenseFormInput, unknown, RetirementExpenseFormVM>({
    resolver: zodResolver(RetirementExpenseFormVMSchema),
    mode: 'onTouched',
    defaultValues: initialForm,
  });

  const { open, setOpen, loading, setLoading } = useRetirementDialogForm({
    resetOnOpen: () => form.reset(buildRetirementExpenseFormInput(initialData, currentYear)),
  });

  const watched = useWatch({ control: form.control });
  const values = (watched ?? initialForm) as RetirementExpenseFormInput;

  const isDebtPayment = initialData?.type === RetirementExpenseType.DEBT_PAYMENT;

  // Derived readouts (previews): the form holds what the user typed, the shared
  // base derives the display value. None of these are RHF fields.
  const durationText = deriveRetirementDurationText(values, RetirementExpenseDialogLabels);
  const growthText = deriveRetirementGrowthText(
    values.growthRate,
    planInflationRate,
    RetirementExpenseDialogLabels,
  );

  const retirementYearPreview = RetirementExpenseDialogLabels.retirementYearPreview(
    (Number(values.currentAnnual) || 0) * ((Number(values.retirementMultiplier) || 0) / 100),
  );

  const onSubmit = form.handleSubmit(async () => {
    setLoading(true);

    try {
      // The resolver only drives field display; this parse is the gate.
      const vm = RetirementExpenseFormVMSchema.parse(form.getValues());
      await onSave(mapRetirementExpenseVMToDomain(vm));
      setOpen(false);
    } catch (error) {
      logger.error('Expense save failed', 'retirement/useRetirementExpenseDialog', {
        error: error instanceof Error ? error.message : String(error),
      });
      console.error('Failed to save expense', error);
    } finally {
      setLoading(false);
    }
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void onSubmit();
  };

  return {
    open,
    setOpen,
    loading,
    form,
    isDebtPayment,
    growthText,
    durationText,
    retirementYearPreview,
    handleSubmit,
  };
}
