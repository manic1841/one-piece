import { useCallback } from 'react';

import { mergeImportedIncomeSourcesUseCase } from '@/application/retirement/use_cases/mergeImportedIncomeSourcesUseCase';
import { appendById, removeById, upsertById } from '@/domains/retirement/planMutations';
import type {
  RetirementIncomeSource,
  RetirementPlan,
  RetirementPlanCreate,
} from '@/domains/retirement/types';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';

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
  const { confirm } = useConfirm();
  const handleAddIncome = useCallback(
    async (incomeData: Omit<RetirementIncomeSource, 'id'>) => {
      if (!id || !plan) {
        throw new Error('Retirement plan is not ready yet. Please wait and try again.');
      }
      await handleUpdatePlan({
        incomes: appendById(plan.incomes, { ...incomeData, id: crypto.randomUUID() }),
      });
    },
    [id, plan, handleUpdatePlan],
  );

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
      const confirmed = await confirm('Are you sure you want to delete this income source?');
      if (!confirmed) return;
      await handleUpdatePlan({
        incomes: removeById(plan.incomes, incomeId),
      });
    },
    [id, plan, confirm, handleUpdatePlan],
  );

  const handleImportIncomeFromTransactions = useCallback(async () => {
    if (!id || !plan) return;

    const imported = await importIncomeData();
    const importedIncomes = imported.filter(
      (item) => typeof item.currentAnnual === 'number' && item.incomeCategory,
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
  }, [id, plan, importIncomeData, handleUpdatePlan]);

  return {
    handleAddIncome,
    handleUpdateIncome,
    handleDeleteIncome,
    handleImportIncomeFromTransactions,
  };
};
