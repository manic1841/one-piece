import { useCallback } from 'react';

import { manageRetirementIncomesUseCase } from '@/application/retirement/use_cases/manageRetirementIncomesUseCase';
import { mergeImportedIncomeSourcesUseCase } from '@/application/retirement/use_cases/mergeImportedIncomeSourcesUseCase';
import type {
  RetirementExpenseCategory,
  RetirementIncomeSource,
  RetirementPlan,
  RetirementPlanCreate,
} from '@/domains/retirement/types';

interface UseRetirementIncomeActionsParams {
  id: string | undefined;
  plan: RetirementPlan | null;
  importData: (
    type: 'transactions' | 'debtRepayments',
    referenceMonths?: number,
  ) => Promise<RetirementExpenseCategory[] | RetirementIncomeSource[]>;
  handleUpdatePlan: (updates: Partial<RetirementPlanCreate>) => Promise<void>;
}

export const useRetirementIncomeActions = ({
  id,
  plan,
  importData,
  handleUpdatePlan,
}: UseRetirementIncomeActionsParams) => {
  const handleAddIncome = useCallback(
    async (incomeData: Omit<RetirementIncomeSource, 'id'>) => {
      if (!id || !plan) {
        throw new Error('Retirement plan is not ready yet. Please wait and try again.');
      }
      await handleUpdatePlan({
        incomes: manageRetirementIncomesUseCase.add({
          plan,
          incomeData,
          id: crypto.randomUUID(),
        }),
      });
    },
    [id, plan, handleUpdatePlan],
  );

  const handleUpdateIncome = useCallback(
    async (incomeId: string, updates: Omit<RetirementIncomeSource, 'id'>) => {
      if (!id || !plan) return;
      await handleUpdatePlan({
        incomes: manageRetirementIncomesUseCase.update({
          plan,
          incomeId,
          updates,
        }),
      });
    },
    [id, plan, handleUpdatePlan],
  );

  const handleDeleteIncome = useCallback(
    async (incomeId: string) => {
      if (!id || !plan) return;
      if (!window.confirm('Are you sure you want to delete this income source?')) return;
      await handleUpdatePlan({
        incomes: manageRetirementIncomesUseCase.remove({
          plan,
          incomeId,
        }),
      });
    },
    [id, plan, handleUpdatePlan],
  );

  const handleImportIncomeFromTransactions = useCallback(async () => {
    if (!id || !plan) return;

    const imported = await importData('transactions', 12);
    const importedIncomes = (imported as RetirementIncomeSource[]).filter(
      (item) => typeof item.baseAmount === 'number' && item.incomeCategory,
    );

    if (importedIncomes.length === 0) {
      return;
    }

    const mergeResult = mergeImportedIncomeSourcesUseCase.execute({
      plan,
      importedIncomes,
    });

    if (!mergeResult.hasChanges) {
      return;
    }

    await handleUpdatePlan({ incomes: mergeResult.incomes });
  }, [id, plan, importData, handleUpdatePlan]);

  return {
    handleAddIncome,
    handleUpdateIncome,
    handleDeleteIncome,
    handleImportIncomeFromTransactions,
  };
};
