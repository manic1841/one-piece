import { useEffect, useState } from 'react';

import { ZodError } from 'zod';

import type { RetirementIncomeSource } from '@/domains/retirement/types';

import {
  RetirementIncomeFormVMSchema,
  buildRetirementIncomeFormVM,
  mapRetirementIncomeVMToDomain,
} from '@/ui/features/retirement/viewmodels/retirementForm.vm';

import { useRetirementDialogForm } from './useRetirementDialogForm';

interface UseRetirementIncomeDialogOptions {
  initialData?: RetirementIncomeSource;
  currentYear: number;
  onSave: (income: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
}

export function useRetirementIncomeDialog({
  initialData,
  currentYear,
  onSave,
}: UseRetirementIncomeDialogOptions) {
  // Initialize with mapper
  const initialForm = buildRetirementIncomeFormVM(initialData, currentYear);

  // Base fields from shared hook
  const {
    open,
    setOpen,
    loading,
    setLoading,
    name,
    setName,
    growthRate,
    setGrowthRate,
    startYear,
    setStartYear,
  } = useRetirementDialogForm({
    initialData,
    currentYear,
    defaultValues: {
      growthRate: initialForm.growthRate,
    },
  });

  // Income-specific fields
  const [type, setType] = useState<RetirementIncomeSource['type']>(initialForm.type);
  const [endYear, setEndYear] = useState<number | ''>(initialForm.endYear ?? '');
  const [lifelong, setLifelong] = useState<boolean>(initialForm.lifelong);
  const [retirementAnnual, setRetirementAnnual] = useState<number | undefined>(
    initialForm.retirementAnnual,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync income-specific fields when opening.
  useEffect(() => {
    if (open) {
      const form = buildRetirementIncomeFormVM(initialData, currentYear);
      setType(form.type);
      setEndYear(form.endYear ?? '');
      setLifelong(form.lifelong);
      setRetirementAnnual(form.retirementAnnual);
      setSubmitError(null);
    }
  }, [open, initialData, currentYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);

    try {
      // Import provenance (calculatedFrom/incomeCategory) passes through
      // untouched: edits never destroy the ledger link (issue #133).
      const vm = RetirementIncomeFormVMSchema.parse({
        name,
        type,
        currentAnnual: initialForm.currentAnnual,
        retirementAnnual,
        growthRate,
        lifelong,
        startYear,
        endYear: lifelong || endYear === '' ? undefined : endYear,
        calculatedFrom: initialForm.calculatedFrom,
        incomeCategory: initialForm.incomeCategory,
        note: initialForm.note,
      });
      const domainData = mapRetirementIncomeVMToDomain(vm);
      await onSave(domainData);
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
  };

  return {
    // State
    open,
    setOpen,
    loading,
    name,
    setName,
    type,
    setType,
    // Read-only passthrough from the domain: edits never touch the import.
    currentAnnual: initialForm.currentAnnual,
    growthRate,
    setGrowthRate,
    retirementAnnual,
    setRetirementAnnual,
    startYear,
    setStartYear,
    endYear,
    setEndYear,
    lifelong,
    setLifelong,
    submitError,
    handleSubmit,
  };
}