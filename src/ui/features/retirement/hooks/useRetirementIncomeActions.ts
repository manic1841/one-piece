import { useCallback } from 'react';

import { mergeImportedIncomeSourcesUseCase } from '@/application/retirement/use_cases/mergeImportedIncomeSourcesUseCase';
import { removeById, upsertById } from '@/domains/retirement/planMutations';
import type {
  RetirementIncomeSource,
  RetirementPlan,
  RetirementPlanCreate,
} from '@/domains/retirement/types';
import { RetirementBaselineLabels } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import { useUndo } from '@/ui/hooks/useUndo';

interface UseRetirementIncomeActionsParams {
  id: string | undefined;
  plan: RetirementPlan | null;
  importIncomeData: () => Promise<RetirementIncomeSource[]>;
  handleUpdatePlan: (updates: Partial<RetirementPlanCreate>) => Promise<void>;
}

export const useRetirementIncomeActions = ({
  id,
  plan,
  importIncomeData,
  handleUpdatePlan,
}: UseRetirementIncomeActionsParams) => {
  const { offer } = useUndo();

  const handleUpdateIncome = useCallback(
    async (incomeId: string, updates: Omit<RetirementIncomeSource, 'id'>) => {
      if (!id || !plan) return;
      await handleUpdatePlan({
        incomes: upsertById(plan.incomes, incomeId, updates),
      });
    },
    [id, plan, handleUpdatePlan],
  );

  const handleDeleteIncome = useCallback(
    async (incomeId: string) => {
      if (!id || !plan) return;
      // Undoable delete (spec #301 §2.4): no confirm modal, restore the whole
      // collection on Undo via a compensating replace.
      const previousIncomes = plan.incomes;
      await handleUpdatePlan({
        incomes: removeById(plan.incomes, incomeId),
      });
      // Action label defaults to the shared 'UNDO' owned by useUndo (spec #301 §2.4).
      offer({
        message: RetirementBaselineLabels.deletedRowToast,
        undo: () => handleUpdatePlan({ incomes: previousIncomes }),
      });
    },
    [id, plan, offer, handleUpdatePlan],
  );

  const handleImportIncomeFromTransactions = useCallback(async (): Promise<number | null> => {
    if (!id || !plan) return null;

    const imported = await importIncomeData();
    const importedIncomes = imported.filter(
      (item) => typeof item.currentAnnual === 'number' && item.incomeCategory,
    );

    const mergeResult = mergeImportedIncomeSourcesUseCase.execute({
      plan,
      importedIncomes,
    });

    // Import only introduces/updates rows; it never triggers a recalculation.
    if (mergeResult.hasChanges) {
      await handleUpdatePlan({ incomes: mergeResult.incomes });
    }

    return mergeResult.unmatchedCount;
  }, [id, plan, importIncomeData, handleUpdatePlan]);

  return {
    handleUpdateIncome,
    handleDeleteIncome,
    handleImportIncomeFromTransactions,
  };
};
