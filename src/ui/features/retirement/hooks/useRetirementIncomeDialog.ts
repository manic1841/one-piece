import { useCallback, useEffect, useState } from 'react';

import type { RetirementIncomeSource } from '@/domains/retirement/types';
import { useAuth } from '@/infra/contexts/useAuth';
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
  const { userProfile } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);

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

  // Income-specific fields
  const [type, setType] = useState<RetirementIncomeSource['type']>(initialForm.type);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialForm.incomeCategory || 'none',
  );
  const [endYear, setEndYear] = useState<number>(initialForm.endYear);
  const [importedFrom, setImportedFrom] = useState<RetirementIncomeSource['importedFrom']>(
    initialForm.importedFrom,
  );
  const [calculatedFrom, setCalculatedFrom] = useState<RetirementIncomeSource['calculatedFrom']>(
    initialForm.calculatedFrom,
  );
  const [incomeCategory, setIncomeCategory] = useState<string | undefined>(
    initialForm.incomeCategory,
  );

  // New interactive import params
  const [importStartDate, setImportStartDate] = useState<string>(
    initialForm.calculatedFrom?.startDate ||
      new Date(currentYear - 1, 0, 1).toISOString().split('T')[0],
  );
  const [importEndDate, setImportEndDate] = useState<string>(
    initialForm.calculatedFrom?.endDate ||
      new Date(currentYear - 1, 11, 31).toISOString().split('T')[0],
  );
  const [importSampleCount, setImportSampleCount] = useState<number>(
    initialForm.calculatedFrom?.sampleCount || 12,
  );

  const loadCategories = useCallback(async () => {
    if (!userProfile?.householdId) return;
    try {
      const plannedIncomes: Array<{ category: string }> = [];
      const uniqueCategories = Array.from(new Set(plannedIncomes.map((pi) => pi.category)));
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Failed to load planned income categories', error);
    }
  }, [userProfile?.householdId]);

  useEffect(() => {
    if (open && userProfile?.householdId) {
      loadCategories();
    }
  }, [open, userProfile?.householdId, loadCategories]);

  // Sync income-specific fields when opening
  useEffect(() => {
    if (open) {
      const form = buildRetirementIncomeFormVM(initialData, currentYear);
      setType(form.type);
      setSelectedCategory(form.incomeCategory || 'none');
      setEndYear(form.endYear);
      setImportedFrom(form.importedFrom);
      setCalculatedFrom(form.calculatedFrom);
      setIncomeCategory(form.incomeCategory);

      if (form.calculatedFrom) {
        setImportStartDate(form.calculatedFrom.startDate);
        setImportEndDate(form.calculatedFrom.endDate);
        setImportSampleCount(form.calculatedFrom.sampleCount);
      }
    }
  }, [open, initialData, currentYear]);

  const recalculateImport = useCallback(async () => {
    if (!userProfile?.householdId || selectedCategory === 'none') return;

    try {
      setCalculatedFrom(undefined);
    } catch (error) {
      console.error('Failed to recalculate import data', error);
    }
  }, [userProfile?.householdId, selectedCategory]);

  // Recalculate when interactive params change, but ONLY if we are in plannedIncome mode
  useEffect(() => {
    if (importedFrom === 'plannedIncome') {
      recalculateImport();
    }
  }, [importedFrom, importStartDate, importEndDate, importSampleCount, recalculateImport]);

  const handleCategoryChange = async (category: string) => {
    setSelectedCategory(category);
    if (category === 'none') {
      setImportedFrom('manual');
      setCalculatedFrom(undefined);
      setIncomeCategory(undefined);
      return;
    }
    if (!name) setName(category);

    setImportedFrom('plannedIncome');
    setIncomeCategory(category);
    // Trigger will happen via useEffect
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const vm = RetirementIncomeFormVMSchema.parse({
        name,
        type,
        baseAmount: amount,
        growthRate,
        startYear,
        endYear,
        importedFrom,
        calculatedFrom,
        incomeCategory,
      });
      const domainData = mapRetirementIncomeVMToDomain(vm);
      await onSave(domainData);
      setOpen(false);
    } catch (error) {
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
    amount,
    setAmount,
    growthRate,
    setGrowthRate,
    startYear,
    setStartYear,
    endYear,
    setEndYear,
    selectedCategory,
    categories,
    calculatedFrom,
    importedFrom,
    setImportedFrom,
    importStartDate,
    setImportStartDate,
    importEndDate,
    setImportEndDate,
    importSampleCount,
    setImportSampleCount,

    // Handlers
    handleCategoryChange,
    handleSubmit,
  };
}
