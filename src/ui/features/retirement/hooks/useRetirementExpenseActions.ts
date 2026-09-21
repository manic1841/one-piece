import { useCallback } from 'react';

import { mergeImportedDebtRepaymentExpensesUseCase } from '@/application/retirement/use_cases/mergeImportedDebtRepaymentExpensesUseCase';
import { appendById, removeById, upsertById } from '@/domains/retirement/planMutations';
import type {
  RetirementExpenseCategory,
  RetirementPlan,
  RetirementPlanCreate,
} from '@/domains/retirement/types';
import { useConfirm } from '@/ui/features/app/confirm/ConfirmDialog';

interface UseRetirementExpenseActionsParams {
  id: string | undefined;
  plan: RetirementPlan | null;
  importDebtData: () => Promise<RetirementExpenseCategory[]>;
  handleUpdatePlan: (updates: Partial<RetirementPlanCreate>) => Promise<void>;
}

export const useRetirementExpenseActions = ({
  id,
  plan,
  importDebtData,
  handleUpdatePlan,
}: UseRetirementExpenseActionsParams) => {
  const handleAddExpense = useCallback(
    async (expenseData: Omit<RetirementExpenseCategory, 'id'>) => {
      if (!id || !plan) return;
      await handleUpdatePlan({
        expenses: appendById(plan.expenses, { ...expenseData, id: crypto.randomUUID() }),
      });
    },
    [id, plan, handleUpdatePlan],
  );

  const handleUpdateExpense = useCallback(
    async (expenseId: string, updates: Omit<RetirementExpenseCategory, 'id'>) => {
      if (!id || !plan) return;

      const nextExpenses = upsertById(plan.expenses, expenseId, updates);

      await handleUpdatePlan({
        expenses: nextExpenses,
      });
    },
    [id, plan, handleUpdatePlan],
  );

  const { confirm } = useConfirm();

  const handleDeleteExpense = useCallback(
    async (expenseId: string) => {
      if (!id || !plan) return;
      const confirmed = await confirm(
        'Are you sure you want to delete this expense category?',
      );
      if (!confirmed) return;
      await handleUpdatePlan({
        expenses: removeById(plan.expenses, expenseId),
      });
    },
    [id, plan, confirm, handleUpdatePlan],
  );

  const handleImportDebtRepayments = useCallback(async () => {
    if (!id || !plan) return;

    const imported = await importDebtData();
    const importedExpenses = imported.filter(
      (item) => typeof item.currentAnnual === 'number' && typeof item.sourceDebtAccountId === 'string',
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
  }, [id, plan, importDebtData, handleUpdatePlan]);

  return {
    handleAddExpense,
    handleUpdateExpense,
    handleDeleteExpense,
    handleImportDebtRepayments,
  };
};
