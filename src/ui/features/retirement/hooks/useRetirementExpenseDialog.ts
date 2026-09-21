import { useEffect, useState } from 'react';

import type { RetirementExpenseCategory } from '@/domains/retirement/types';
import {
  RetirementExpenseFormVMSchema,
  buildRetirementExpenseFormVM,
  mapRetirementExpenseVMToDomain,
} from '@/ui/features/retirement/viewmodels/retirementForm.vm';
import { logger } from '@/utils/logger';

import { useRetirementDialogForm } from './useRetirementDialogForm';

interface UseRetirementExpenseDialogOptions {
  initialData?: RetirementExpenseCategory;
  currentYear: number;
  onSave: (expense: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
}

export function useRetirementExpenseDialog({
  initialData,
  currentYear,
  onSave,
}: UseRetirementExpenseDialogOptions) {
  // Initialize with mapper
  const initialForm = buildRetirementExpenseFormVM(initialData, currentYear);

  // Base fields from shared hook
  const {
    open,
    setOpen,
    loading,
    setLoading,
    name,
    setName,
    amount,
    setAmount,
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

  // Expense-specific fields
  const [endYear, setEndYear] = useState<string>(initialForm.endYear || '2100');
  const [retirementMultiplier, setRetirementMultiplier] = useState<number>(
    initialForm.retirementMultiplier,
  );

  // Sync expense-specific fields when opening
  useEffect(() => {
    if (open) {
      const form = buildRetirementExpenseFormVM(initialData, currentYear);
      setEndYear(form.endYear || '');
      setRetirementMultiplier(form.retirementMultiplier);
    }
  }, [open, initialData, currentYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const vm = RetirementExpenseFormVMSchema.parse({
        name,
        sourceDebtAccountId: initialForm.sourceDebtAccountId,
        type: initialForm.type,
        includesPrincipal: initialForm.includesPrincipal,
        interestOnly: initialForm.interestOnly,
        calculatedFrom: initialForm.calculatedFrom,
        expenseCategory: initialForm.expenseCategory,
        currentAnnual: amount,
        growthRate: growthRate === 0 ? 0 : growthRate,
        retirementMultiplier,
        startYear,
        endYear,
      });

      const domainData = mapRetirementExpenseVMToDomain(vm);

      await onSave(domainData);
      setOpen(false);
    } catch (error) {
      logger.error('Expense save failed', 'retirement/useRetirementExpenseDialog', {
        error: error instanceof Error ? error.message : String(error),
      });
      console.error('Failed to save expense', error);
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
    amount,
    setAmount,
    growthRate,
    setGrowthRate,
    startYear,
    setStartYear,
    endYear,
    setEndYear,
    retirementMultiplier,
    setRetirementMultiplier,

    // Handlers
    handleSubmit,
  };
}
