import { useCallback } from 'react';

import { manageRetirementExpensesUseCase } from '@/application/retirement/use_cases/manageRetirementExpensesUseCase';
import { mergeImportedDebtRepaymentExpensesUseCase } from '@/application/retirement/use_cases/mergeImportedDebtRepaymentExpensesUseCase';
import type {
  RetirementExpenseCategory,
  RetirementIncomeSource,
  RetirementPlan,
  RetirementPlanCreate,
} from '@/domains/retirement/types';
import { logger } from '@/utils/logger';

interface UseRetirementExpenseActionsParams {
  id: string | undefined;
  plan: RetirementPlan | null;
  importData: (
    type: 'transactions' | 'debtRepayments',
    referenceMonths?: number,
  ) => Promise<RetirementExpenseCategory[] | RetirementIncomeSource[]>;
  handleUpdatePlan: (updates: Partial<RetirementPlanCreate>) => Promise<void>;
}

export const useRetirementExpenseActions = ({
  id,
  plan,
  importData,
  handleUpdatePlan,
}: UseRetirementExpenseActionsParams) => {
  const handleAddExpense = useCallback(
    async (expenseData: Omit<RetirementExpenseCategory, 'id'>) => {
      if (!id || !plan) return;
      logger.debug('handleAddExpense called', 'retirement/useRetirementExpenseActions', {
        planId: id,
        mode: expenseData.calculationMode,
        linkedIncomeId: expenseData.linkedIncomeId,
      });
      await handleUpdatePlan({
        expenses: manageRetirementExpensesUseCase.add({
          plan,
          expenseData,
          id: crypto.randomUUID(),
        }),
      });
      logger.info('handleAddExpense completed', 'retirement/useRetirementExpenseActions', {
        planId: id,
      });
    },
    [id, plan, handleUpdatePlan],
  );

  const handleUpdateExpense = useCallback(
    async (expenseId: string, updates: Omit<RetirementExpenseCategory, 'id'>) => {
      if (!id || !plan) return;
      const current = plan.expenses.find((expense) => expense.id === expenseId);
      logger.debug('handleUpdateExpense called', 'retirement/useRetirementExpenseActions', {
        planId: id,
        expenseId,
        mode: updates.calculationMode,
        linkedIncomeId: updates.linkedIncomeId,
        currentMode: current?.calculationMode,
        currentLinkedIncomeId: current?.linkedIncomeId,
      });

      const nextExpenses = manageRetirementExpensesUseCase.update({
        plan,
        expenseId,
        updates,
      });
      const next = nextExpenses.find((expense) => expense.id === expenseId);
      logger.debug('handleUpdateExpense merged result', 'retirement/useRetirementExpenseActions', {
        planId: id,
        expenseId,
        nextMode: next?.calculationMode,
        nextLinkedIncomeId: next?.linkedIncomeId,
      });

      await handleUpdatePlan({
        expenses: nextExpenses,
      });
      logger.info('handleUpdateExpense completed', 'retirement/useRetirementExpenseActions', {
        planId: id,
        expenseId,
      });
    },
    [id, plan, handleUpdatePlan],
  );

  const handleDeleteExpense = useCallback(
    async (expenseId: string) => {
      if (!id || !plan) return;
      if (!window.confirm('Are you sure you want to delete this expense category?')) return;
      await handleUpdatePlan({
        expenses: manageRetirementExpensesUseCase.remove({
          plan,
          expenseId,
        }),
      });
    },
    [id, plan, handleUpdatePlan],
  );

  const handleImportDebtRepayments = useCallback(async () => {
    if (!id || !plan) return;

    const imported = await importData('debtRepayments', 12);
    const importedExpenses = (imported as RetirementExpenseCategory[]).filter(
      (item) => typeof item.baseAmount === 'number' && typeof item.sourceDebtAccountId === 'string',
    );

    if (importedExpenses.length === 0) {
      return;
    }

    const mergeResult = mergeImportedDebtRepaymentExpensesUseCase.execute({
      plan,
      importedExpenses,
    });

    if (!mergeResult.hasChanges) {
      return;
    }

    await handleUpdatePlan({ expenses: mergeResult.expenses });
  }, [id, plan, importData, handleUpdatePlan]);

  return {
    handleAddExpense,
    handleUpdateExpense,
    handleDeleteExpense,
    handleImportDebtRepayments,
  };
};
