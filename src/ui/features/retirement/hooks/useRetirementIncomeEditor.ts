import { useEffect, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { type UseFormReturn, useForm, useWatch } from 'react-hook-form';
import { ZodError } from 'zod';

import type { RetirementIncomeSource } from '@/domains/retirement/types';
import { showToast } from '@/ui/components/Toast';
import {
  RetirementEntryEditorLabels as L,
  RetirementGrowthReadoutLabels,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';
import {
  type RetirementIncomeFormInput,
  type RetirementIncomeFormVM,
  RetirementIncomeFormVMSchema,
  buildRetirementIncomeFormInput,
  defaultIncomeEndCondition,
  mapRetirementIncomeVMToDomain,
} from '@/ui/features/retirement/viewmodels/retirementForm.vm';

import { deriveRetirementGrowthText, useRetirementDialogForm } from './useRetirementDialogForm';

interface UseRetirementIncomeEditorOptions {
  initialData?: RetirementIncomeSource;
  currentYear: number;
  birthYear: number;
  retirementAge: number;
  planInflationRate: number;
  onSave: (income: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
}

export interface RetirementIncomeEditorHook {
  open: boolean;
  setOpen: (value: boolean) => void;
  loading: boolean;
  /** The RHF form; the component binds fields through it. */
  form: UseFormReturn<RetirementIncomeFormInput, unknown, RetirementIncomeFormVM>;
  /** Import-derived annual, shown read-only. Not a form field. */
  currentAnnual: number | null;
  /** Derived growth readout (preview), not an RHF field. */
  growthText: string;
  /** Import provenance label, or null when the row was not imported. */
  importSourceText: string | null;
  submitError: string | null;
  handleSubmit: (event: React.FormEvent) => void;
}

const importSourceText = (income?: RetirementIncomeSource): string | null =>
  income?.incomeCategory ?? income?.calculatedFrom?.ledgerCode ?? null;

/**
 * Controller for the income side editor (ADR-0064). RHF owns the editable fields;
 * the growth readout is derived here, outside RHF. Submit runs the authoritative
 * `Schema.parse` gate before the mapper collapses the end-condition semantics.
 */
export function useRetirementIncomeEditor({
  initialData,
  currentYear,
  birthYear,
  retirementAge,
  planInflationRate,
  onSave,
}: UseRetirementIncomeEditorOptions): RetirementIncomeEditorHook {
  const retirementYear = birthYear + retirementAge;
  const buildInput = (): RetirementIncomeFormInput =>
    buildRetirementIncomeFormInput(initialData, { currentYear, retirementYear });

  const form = useForm<RetirementIncomeFormInput, unknown, RetirementIncomeFormVM>({
    resolver: zodResolver(RetirementIncomeFormVMSchema),
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

  // Create mode: keep the end-condition default in step with the selected type
  // (Salary → 退休時結束; 其餘 → 持續至預期壽命). Editing never rewrites semantics.
  const type = useWatch({ control: form.control, name: 'type' });
  const previousType = useRef(type);
  useEffect(() => {
    if (initialData || type === previousType.current) return;
    previousType.current = type;
    form.setValue('endCondition', defaultIncomeEndCondition(type ?? 'salary'));
  }, [type, initialData, form]);

  const watched = useWatch({ control: form.control });
  const values = (watched ?? buildInput()) as RetirementIncomeFormInput;
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
      const parsed = RetirementIncomeFormVMSchema.parse(form.getValues());
      // Import provenance (calculatedFrom/incomeCategory) rides along untouched:
      // an edit never destroys the ledger link (issue #133).
      await onSave(
        mapRetirementIncomeVMToDomain(parsed, {
          birthYear,
          retirementYear,
          retirementAnnual: initialData?.retirementAnnual,
        }),
      );
      showToast(L.savedIncome);
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
    currentAnnual: initialData?.currentAnnual ?? null,
    growthText,
    importSourceText: importSourceText(initialData),
    submitError,
    handleSubmit,
  };
}
