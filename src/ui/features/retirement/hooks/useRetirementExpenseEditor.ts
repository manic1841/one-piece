import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { type UseFormReturn, useForm, useWatch } from 'react-hook-form';

import { RetirementExpenseType } from '@/domains/retirement/schemas';
import type { RetirementExpenseCategory } from '@/domains/retirement/types';
import { showToast } from '@/ui/components/Toast';
import {
  RetirementEntryEditorLabels as L,
  RetirementGrowthReadoutLabels,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';
import {
  type RetirementExpenseFormInput,
  type RetirementExpenseFormVM,
  RetirementExpenseFormVMSchema,
  buildRetirementExpenseFormInput,
  mapRetirementExpenseVMToDomain,
} from '@/ui/features/retirement/viewmodels/retirementForm.vm';
import { logger } from '@/utils/logger';

import { deriveRetirementGrowthText, useRetirementDialogForm } from './useRetirementDialogForm';

interface UseRetirementExpenseEditorOptions {
  initialData?: RetirementExpenseCategory;
  currentYear: number;
  birthYear: number;
  retirementAge: number;
  planInflationRate: number;
  onSave: (expense: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
}

export interface RetirementExpenseEditorHook {
  open: boolean;
  setOpen: (value: boolean) => void;
  loading: boolean;
  /** The RHF form; the component binds fields through it. */
  form: UseFormReturn<RetirementExpenseFormInput, unknown, RetirementExpenseFormVM>;
  /** Debt-derived category: its annual is imported and read-only. */
  isDebtPayment: boolean;
  /** Import-derived annual, shown read-only (spec #301 §4.1/§4.2). Not a form field. */
  currentAnnual: number | null;
  /** Derived growth readout (preview), not an RHF field. */
  growthText: string;
  /** Import provenance label, or null when the row was not imported. */
  importSourceText: string | null;
  submitError: string | null;
  handleSubmit: (event: React.FormEvent) => void;
}

/**
 * Controller for the expense side editor (ADR-0064). RHF owns the editable fields;
 * the growth readout is derived here, outside RHF. Submit runs the authoritative
 * `Schema.parse` gate before the mapper collapses the end-condition semantics.
 */
export function useRetirementExpenseEditor({
  initialData,
  currentYear,
  birthYear,
  retirementAge,
  planInflationRate,
  onSave,
}: UseRetirementExpenseEditorOptions): RetirementExpenseEditorHook {
  const retirementYear = birthYear + retirementAge;
  const buildInput = (): RetirementExpenseFormInput =>
    buildRetirementExpenseFormInput(initialData, { currentYear, retirementYear });

  const form = useForm<RetirementExpenseFormInput, unknown, RetirementExpenseFormVM>({
    resolver: zodResolver(RetirementExpenseFormVMSchema),
    mode: 'onTouched',
    defaultValues: buildInput(),
  });

  const [submitError, setSubmitError] = useState<string | null>(null);

  const { open, setOpen, loading, setLoading } = useRetirementDialogForm({
    resetOnOpen: () => {
      form.reset(buildInput());
      setSubmitError(null);
    },
  });

  const isDebtPayment = initialData?.type === RetirementExpenseType.DEBT_PAYMENT;

  const watched = useWatch({ control: form.control });
  const values = (watched ?? buildInput()) as RetirementExpenseFormInput;
  const growthText = deriveRetirementGrowthText(
    values.growthRate,
    planInflationRate,
    RetirementGrowthReadoutLabels,
  );

  const onSubmit = form.handleSubmit(async () => {
    setLoading(true);
    setSubmitError(null);

    try {
      // The resolver only drives field display; this parse is the gate.
      const vm = RetirementExpenseFormVMSchema.parse(form.getValues());
      await onSave(
        mapRetirementExpenseVMToDomain(vm, {
          birthYear,
          retirementYear,
          // 退休後水準退出 UI：新列預設 100%，編輯時保留既有值。
          retirementMultiplier: initialData?.retirementMultiplier ?? 1,
        }),
      );
      showToast(L.savedExpense);
      setOpen(false);
    } catch (error) {
      logger.error('Expense save failed', 'retirement/useRetirementExpenseEditor', {
        error: error instanceof Error ? error.message : String(error),
      });
      setSubmitError(error instanceof Error ? error.message : 'Failed to save expense.');
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
    // Read-only passthrough from the domain: 基準年金額 is import-derived (§4.1/§4.2).
    currentAnnual: initialData?.currentAnnual ?? null,
    growthText,
    importSourceText: isDebtPayment ? null : (initialData?.expenseCategory ?? null),
    submitError,
    handleSubmit,
  };
}
