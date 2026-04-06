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
  householdId: string;
  availableIncomes?: RetirementIncomeSource[];
}

export function useRetirementIncomeDialog({
  initialData,
  currentYear,
  onSave,
  householdId,
  availableIncomes = [],
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
  const [endYear, setEndYear] = useState<number>(initialForm.endYear);
  const [incomeCategory, setIncomeCategory] = useState<string | undefined>(
    initialForm.incomeCategory,
  );
  const [incomeCalculationMode, setIncomeCalculationMode] = useState<
    'FIXED' | 'IMPORTED' | 'DERIVED'
  >(initialForm.incomeCalculationMode ?? 'FIXED');
  const [baseIncomeId, setBaseIncomeId] = useState<string | undefined>(initialForm.baseIncomeId);
  const [multiplier, setMultiplier] = useState<number>(initialForm.multiplier ?? 1);
  const [ledgerCode, setLedgerCode] = useState<string>(
    initialForm.calculatedFrom?.ledgerCode ?? '',
  );
  const [sampleStartDate, setSampleStartDate] = useState<string>(
    initialForm.calculatedFrom?.startDate ?? '',
  );
  const [sampleEndDate, setSampleEndDate] = useState<string>(
    initialForm.calculatedFrom?.endDate ?? '',
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Sync income-specific fields when opening
  useEffect(() => {
    if (open) {
      setSubmitError(null);
      const form = buildRetirementIncomeFormVM(initialData, currentYear);
      setType(form.type);
      setEndYear(form.endYear);
      setIncomeCategory(form.incomeCategory);
      setIncomeCalculationMode(form.incomeCalculationMode ?? 'FIXED');
      setBaseIncomeId(form.baseIncomeId);
      setMultiplier(form.multiplier ?? 1);
      setLedgerCode(form.calculatedFrom?.ledgerCode ?? '');
      setSampleStartDate(form.calculatedFrom?.startDate ?? '');
      setSampleEndDate(form.calculatedFrom?.endDate ?? '');
    }
  }, [open, initialData, currentYear]);

  // Calculate for IMPORTED mode: fetch transactions from ledger
  const handleCalculateImported = async () => {
    try {
      setCalculating(true);
      setSubmitError(null);

      const normalizedLedgerCode = ledgerCode.trim();
      if (!normalizedLedgerCode) {
        throw new Error('Ledger Code is required.');
      }
      if (!normalizedLedgerCode.startsWith('income:')) {
        throw new Error('Ledger Code must start with income:.');
      }
      if (!sampleStartDate || !sampleEndDate) {
        throw new Error('Sample start and end dates are required.');
      }
      if (sampleStartDate > sampleEndDate) {
        throw new Error('Sample start date must be earlier than or equal to end date.');
      }

      // Import dynamically to avoid circular dependencies
      const { transactionRepository } = await import('@/infra/repositories/transactionRepository');
      const { where } = await import('firebase/firestore');

      // Query transactions for the given ledger code within the date range
      const startDate = new Date(sampleStartDate);
      const endDate = new Date(sampleEndDate);
      endDate.setDate(endDate.getDate() + 1); // Include end date

      const transactions = await transactionRepository.list(
        [householdId],
        [
          where('date', '>=', startDate),
          where('date', '<', endDate),
          where('ledgerCodes', 'array-contains', normalizedLedgerCode),
        ],
      );

      // Sum the amounts for this ledger code across all transactions
      // For income ledger codes, sum the credit amounts
      let totalAmount = 0;
      for (const transaction of transactions) {
        for (const entry of transaction.entries) {
          if (entry.ledgerCode === normalizedLedgerCode) {
            totalAmount += entry.credit; // Income is typically credited
          }
        }
      }

      setAmount(totalAmount);
    } catch (error) {
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('Failed to calculate amount from ledger.');
      }
      console.error('Calculation error:', error);
    } finally {
      setCalculating(false);
    }
  };

  // Calculate for DERIVED mode: use base income × multiplier
  const handleCalculateDerived = async () => {
    try {
      setCalculating(true);
      setSubmitError(null);

      if (!baseIncomeId) {
        throw new Error('Base Income Source is required.');
      }

      const baseIncome = availableIncomes.find((inc) => inc.id === baseIncomeId);
      if (!baseIncome) {
        throw new Error('Base income source not found.');
      }

      const calculatedAmount = baseIncome.baseAmount * multiplier;
      setAmount(calculatedAmount);
    } catch (error) {
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('Failed to calculate derived amount.');
      }
      console.error('Calculation error:', error);
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);

    try {
      const isImported = incomeCalculationMode === 'IMPORTED';
      const normalizedLedgerCode = ledgerCode.trim();

      if (isImported) {
        if (!normalizedLedgerCode) {
          throw new Error('Ledger Code is required for imported income.');
        }
        if (!normalizedLedgerCode.startsWith('income:')) {
          throw new Error('Ledger Code must start with income:.');
        }
        if (!sampleStartDate || !sampleEndDate) {
          throw new Error('Sample start and end dates are required.');
        }
        if (sampleStartDate > sampleEndDate) {
          throw new Error('Sample start date must be earlier than or equal to end date.');
        }
      }

      const calculatedFrom = isImported
        ? {
            ledgerCode: normalizedLedgerCode,
            startDate: sampleStartDate,
            endDate: sampleEndDate,
            totalAmount: amount,
            monthlyAverage: amount / 12,
            sampleCount: 12,
            importedAt: new Date().toISOString(),
          }
        : undefined;

      const vm = RetirementIncomeFormVMSchema.parse({
        name,
        type,
        baseAmount: amount,
        growthRate,
        startYear,
        endYear,
        importedFrom: isImported ? 'transactionEntries' : 'manual',
        incomeCalculationMode,
        calculatedFrom,
        incomeCategory: isImported ? normalizedLedgerCode : incomeCategory,
        baseIncomeId,
        multiplier,
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
    amount,
    setAmount,
    growthRate,
    setGrowthRate,
    startYear,
    setStartYear,
    endYear,
    setEndYear,
    incomeCalculationMode,
    setIncomeCalculationMode,
    baseIncomeId,
    setBaseIncomeId,
    multiplier,
    setMultiplier,
    ledgerCode,
    setLedgerCode,
    sampleStartDate,
    setSampleStartDate,
    sampleEndDate,
    setSampleEndDate,
    submitError,
    calculating,

    // Handlers
    handleSubmit,
    handleCalculateImported,
    handleCalculateDerived,
  };
}
