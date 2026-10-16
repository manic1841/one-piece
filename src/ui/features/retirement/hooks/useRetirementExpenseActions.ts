import { useCallback } from 'react';

import { mergeImportedDebtRepaymentExpensesUseCase } from '@/application/retirement/use_cases/mergeImportedDebtRepaymentExpensesUseCase';
import { appendById, removeById, upsertById } from '@/domains/retirement/planMutations';
import type {
  RetirementExpenseCategory,
  RetirementPlan,
  RetirementPlanCreate,
} from '@/domains/retirement/types';
import { newId } from '@/shared/id';
import { RetirementBaselineLabels } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import { useUndo } from '@/ui/hooks/useUndo';

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
        expenses: appendById(plan.expenses, { ...expenseData, id: newId() }),
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

  const { offer } = useUndo();

  const handleDeleteExpense = useCallback(
    async (expenseId: string) => {
      if (!id || !plan) return;
      // Undoable delete (spec #301 §2.4): no confirm modal, restore the whole
      // collection on Undo via a compensating replace.
      const previousExpenses = plan.expenses;
      await handleUpdatePlan({
        expenses: removeById(plan.expenses, expenseId),
      });
      offer({
        message: RetirementBaselineLabels.deletedRowToast,
        actionLabel: RetirementBaselineLabels.undoAction,
        undo: () => handleUpdatePlan({ expenses: previousExpenses }),
      });
    },
    [id, plan, offer, handleUpdatePlan],
  );

  const handleImportDebtRepayments = useCallback(async (): Promise<number | null> => {
    if (!id || !plan) return null;

    const imported = await importDebtData();
    const importedExpenses = imported.filter(
      (item) =>
        typeof item.currentAnnual === 'number' && typeof item.sourceDebtAccountId === 'string',
    );

    const mergeResult = mergeImportedDebtRepaymentExpensesUseCase.execute({
      plan,
      importedExpenses,
    });

    // Import only introduces/updates rows; it never triggers a recalculation.
    if (mergeResult.hasChanges) {
      await handleUpdatePlan({ expenses: mergeResult.expenses });
    }

    return mergeResult.unmatchedCount;
  }, [id, plan, importDebtData, handleUpdatePlan]);

  return {
    handleAddExpense,
    handleUpdateExpense,
    handleDeleteExpense,
    handleImportDebtRepayments,
  };
};
