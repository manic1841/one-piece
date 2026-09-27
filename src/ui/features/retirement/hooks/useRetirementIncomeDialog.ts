import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { type UseFormReturn, useForm, useWatch } from 'react-hook-form';
import { ZodError } from 'zod';

import type { RetirementIncomeSource } from '@/domains/retirement/types';
import { RetirementIncomeDialogLabels } from '@/ui/constants/retirement/incomeDialogLabels';
import {
  type RetirementIncomeFormInput,
  type RetirementIncomeFormVM,
  RetirementIncomeFormVMSchema,
  buildRetirementIncomeFormInput,
  mapRetirementIncomeVMToDomain,
} from '@/ui/features/retirement/viewmodels/retirementForm.vm';

import {
  deriveRetirementDurationText,
  deriveRetirementGrowthText,
  useRetirementDialogForm,
} from './useRetirementDialogForm';

interface UseRetirementIncomeDialogOptions {
  initialData?: RetirementIncomeSource;
  currentYear: number;
  planInflationRate: number;
  onSave: (income: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
}

export interface RetirementIncomeDialogHook {
  open: boolean;
  setOpen: (value: boolean) => void;
  loading: boolean;
  /** The RHF form; the component binds fields through it. */
  form: UseFormReturn<RetirementIncomeFormInput, unknown, RetirementIncomeFormVM>;
  /** Import-derived annual, shown read-only. Not a form field. */
  currentAnnual: number | null;
  /** Derived readouts (previews), not RHF fields. */
  growthText: string;
  durationText: string;
  submitError: string | null;
  handleSubmit: (event: React.FormEvent) => void;
}

/**
 * Controller for the income dialog (ADR-0064). RHF owns the editable fields;
 * the growth/duration readouts are derived here, outside RHF. Submit runs the
 * authoritative `Schema.parse` gate before the mapper and the use case.
 */
export function useRetirementIncomeDialog({
  initialData,
  currentYear,
  planInflationRate,
  onSave,
}: UseRetirementIncomeDialogOptions): RetirementIncomeDialogHook {
  const initialForm = buildRetirementIncomeFormInput(initialData, currentYear);

  const form = useForm<RetirementIncomeFormInput, unknown, RetirementIncomeFormVM>({
    resolver: zodResolver(RetirementIncomeFormVMSchema),
    mode: 'onTouched',
    defaultValues: initialForm,
  });

  const [submitError, setSubmitError] = useState<string | null>(null);

  const { open, setOpen, loading, setLoading } = useRetirementDialogForm({
    resetOnOpen: () => {
      form.reset(buildRetirementIncomeFormInput(initialData, currentYear));
      setSubmitError(null);
    },
  });

  const watched = useWatch({ control: form.control });
  const values = (watched ?? initialForm) as RetirementIncomeFormInput;

  // Derived readouts (previews): the form holds what the user typed, the shared
  // base derives the display value. Neither is an RHF field.
  const durationText = deriveRetirementDurationText(values, RetirementIncomeDialogLabels);
  const growthText = deriveRetirementGrowthText(
    values.growthRate,
    planInflationRate,
    RetirementIncomeDialogLabels,
  );

  const onSubmit = form.handleSubmit(async () => {
    setLoading(true);
    setSubmitError(null);

    try {
      // The resolver only drives field display; this parse is the gate.
      const parsed = RetirementIncomeFormVMSchema.parse(form.getValues());
      // Lifelong supersedes any end year left behind in the field.
      const vm: RetirementIncomeFormVM = parsed.lifelong
        ? { ...parsed, endYear: undefined }
        : parsed;
      // Import provenance (calculatedFrom/incomeCategory) rides along untouched:
      // an edit never destroys the ledger link (issue #133).
      await onSave(mapRetirementIncomeVMToDomain(vm));
      setOpen(false);
    } catch (error) {
      if (error instanceof ZodError) {
        setSubmitError(error.issues[0]?.message ?? 'Invalid income form input.');
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('Failed to save income.');
      }
      console.error('Failed to save income', error);
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
    // Read-only passthrough from the domain: edits never touch the import.
    currentAnnual: initialForm.currentAnnual ?? null,
    growthText,
    durationText,
    submitError,
    handleSubmit,
  };
}
