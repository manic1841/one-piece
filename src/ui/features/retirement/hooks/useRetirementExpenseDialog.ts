import { useCallback, useEffect, useState } from 'react';

import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import {
  CalculationMode,
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  SalaryPercentageRetirementMode,
} from '@/domains/retirement/types';
import { useAuth } from '@/infra/contexts/useAuth';
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
  /** Available income streams in the plan (used for linkedIncomeId dropdown) */
  incomes?: RetirementIncomeSource[];
}

type Project = Awaited<ReturnType<typeof listProjectsUseCase.execute>>[number];

export function useRetirementExpenseDialog({
  initialData,
  currentYear,
  onSave,
  incomes = [],
}: UseRetirementExpenseDialogOptions) {
  const { userProfile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);

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
  // Dual-mode fields
  const [calculationMode, setCalculationMode] = useState<CalculationMode>(
    initialForm.calculationMode,
  );
  const [salaryPercentage, setSalaryPercentage] = useState<number>(
    initialForm.salaryPercentage ?? 35,
  );
  const [salaryPercentageRetirementMode, setSalaryPercentageRetirementMode] =
    useState<SalaryPercentageRetirementMode>(
      initialForm.salaryPercentageRetirementMode ?? SalaryPercentageRetirementMode.MANUAL_FALLBACK,
    );
  const [linkedIncomeId, setLinkedIncomeId] = useState<string | undefined>(
    initialForm.linkedIncomeId ?? undefined,
  );
  const [fallbackAmount, setFallbackAmount] = useState<number>(initialForm.fallbackAmount ?? 0);

  const loadProjects = useCallback(async () => {
    if (!userProfile?.householdId) return;
    try {
      const allProjects = await listProjectsUseCase.execute({
        householdId: userProfile.householdId,
      });
      setProjects(allProjects.filter((p) => p.isActive));
    } catch (error) {
      console.error('Failed to load projects', error);
    }
  }, [userProfile?.householdId]);

  useEffect(() => {
    if (open && userProfile?.householdId) {
      loadProjects();
    }
  }, [open, userProfile?.householdId, loadProjects]);

  // Sync expense-specific fields when opening
  useEffect(() => {
    if (open) {
      const form = buildRetirementExpenseFormVM(initialData, currentYear);
      setEndYear(form.endYear || '');
      setRetirementMultiplier(form.retirementMultiplier);
      setCalculationMode(form.calculationMode);
      setSalaryPercentage(form.salaryPercentage ?? 35);
      setSalaryPercentageRetirementMode(
        form.salaryPercentageRetirementMode ?? SalaryPercentageRetirementMode.MANUAL_FALLBACK,
      );
      setLinkedIncomeId(form.linkedIncomeId ?? undefined);
      setFallbackAmount(form.fallbackAmount ?? 0);
    }
  }, [open, initialData, currentYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      logger.debug('Submitting expense form', 'retirement/useRetirementExpenseDialog', {
        mode: calculationMode,
        name,
        linkedIncomeId,
        salaryPercentage,
        salaryPercentageRetirementMode,
        fallbackAmount,
        startYear,
        endYear,
        isEditing: !!initialData,
      });

      const vm = RetirementExpenseFormVMSchema.parse({
        name,
        sourceDebtAccountId: initialForm.sourceDebtAccountId,
        type: initialForm.type,
        includesPrincipal: initialForm.includesPrincipal,
        interestOnly: initialForm.interestOnly,
        calculatedFrom: initialForm.calculatedFrom,
        calculationMode,
        baseAmount: amount,
        growthRate,
        retirementMultiplier,
        salaryPercentage,
        salaryPercentageRetirementMode,
        linkedIncomeId: linkedIncomeId || undefined,
        fallbackAmount:
          salaryPercentageRetirementMode === SalaryPercentageRetirementMode.MANUAL_FALLBACK &&
          fallbackAmount > 0
            ? fallbackAmount
            : undefined,
        startYear,
        endYear,
      });

      logger.debug('Expense form parsed', 'retirement/useRetirementExpenseDialog', {
        mode: vm.calculationMode,
        linkedIncomeId: vm.linkedIncomeId,
        salaryPercentage: vm.salaryPercentage,
        fallbackAmount: vm.fallbackAmount,
      });

      const domainData = mapRetirementExpenseVMToDomain(vm);

      logger.debug('Expense domain payload mapped', 'retirement/useRetirementExpenseDialog', {
        mode: domainData.calculationMode,
        linkedIncomeId: domainData.linkedIncomeId,
        salaryPercentage: domainData.salaryPercentage,
        fallbackAmount: domainData.fallbackAmount,
        startYear: domainData.startYear,
        endYear: domainData.endYear,
      });

      await onSave(domainData);
      logger.info('Expense save callback succeeded', 'retirement/useRetirementExpenseDialog', {
        mode: domainData.calculationMode,
        linkedIncomeId: domainData.linkedIncomeId,
      });
      setOpen(false);
    } catch (error) {
      logger.error('Expense save failed', 'retirement/useRetirementExpenseDialog', {
        error: error instanceof Error ? error.message : String(error),
        mode: calculationMode,
        linkedIncomeId,
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
    calculationMode,
    setCalculationMode,
    salaryPercentage,
    setSalaryPercentage,
    salaryPercentageRetirementMode,
    setSalaryPercentageRetirementMode,
    linkedIncomeId,
    setLinkedIncomeId,
    fallbackAmount,
    setFallbackAmount,
    projects,
    incomes,

    // Handlers
    handleSubmit,
  };
}
