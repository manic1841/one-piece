import { useCallback } from 'react';

import { mergeImportedExpensesUseCase } from '@/application/retirement/use_cases/mergeImportedExpensesUseCase';
import { calculatePlanProjection } from '@/domains/retirement/logic/retirementPlanProjection';
import { useRetirementEventActions } from '@/ui/features/retirement/hooks/useRetirementEventActions';
import { useRetirementExpenseActions } from '@/ui/features/retirement/hooks/useRetirementExpenseActions';
import { useRetirementIncomeActions } from '@/ui/features/retirement/hooks/useRetirementIncomeActions';
import { useRetirementPlanCore } from '@/ui/features/retirement/hooks/useRetirementPlanCore';
import {
  mapRetirementEventToVM,
  mapRetirementExpenseToVM,
  mapRetirementIncomeToVM,
  mapRetirementPlanToAssumptionsDisplayVM,
  mapRetirementPlanToHeaderVM,
  mapRetirementProjectionToVM,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

export const useRetirementPlanDetailPage = (
  id: string | undefined,
  householdId: string | undefined,
  userEmail: string | undefined,
) => {
  const {
    plan,
    loading,
    error,
    netWorthSource,
    isEditingName,
    editedName,
    setEditedName,
    setIsEditingName,
    staleIncomeSyncBanner,
    handleApplyStaleIncomeSync,
    handleDismissStaleIncomeSync,
    handleUpdatePlan,
    handleToggleAutoUpdate,
    handleRecalculate,
    handleDelete,
    handleSaveName,
    handleCancelEditName,
    importIncomeData,
    importDebtData,
    importExpenseDataFromLedger,
  } = useRetirementPlanCore({ id, householdId, userEmail });

  const { handleAddExpense, handleUpdateExpense, handleDeleteExpense, handleImportDebtRepayments } =
    useRetirementExpenseActions({
      id,
      plan,
      importDebtData,
      handleUpdatePlan,
    });

  const handleImportExpensesFromLedger = useCallback(async () => {
    if (!plan) return;
    const imported = await importExpenseDataFromLedger();
    if (imported.length === 0) return;

    const mergeResult = mergeImportedExpensesUseCase.execute({ plan, importedExpenses: imported });
    if (!mergeResult.hasChanges) return;

    await handleUpdatePlan({ expenses: mergeResult.expenses });
  }, [plan, importExpenseDataFromLedger, handleUpdatePlan]);

  const { handleAddEvent, handleUpdateEvent, handleDeleteEvent } = useRetirementEventActions({
    id,
    plan,
    handleUpdatePlan,
  });

  const {
    handleAddIncome,
    handleUpdateIncome,
    handleDeleteIncome,
    handleImportIncomeFromTransactions,
  } = useRetirementIncomeActions({
    id,
    plan,
    importIncomeData,
    handleUpdatePlan,
  });

  const projectionVM =
    plan && netWorthSource && 'startingNetWorth' in netWorthSource
      ? mapRetirementProjectionToVM(
          calculatePlanProjection(plan, netWorthSource.startingNetWorth),
          plan.birthYear + plan.retirementAge,
          plan,
        )
      : null;

  return {
    plan,
    headerVM: plan ? mapRetirementPlanToHeaderVM(plan) : null,
    assumptionsVM: plan ? mapRetirementPlanToAssumptionsDisplayVM(plan) : null,
    netWorthSource,
    incomeItems: plan
      ? plan.incomes.map((income) => ({ domain: income, vm: mapRetirementIncomeToVM(income) }))
      : [],
    expenseItems: plan
      ? plan.expenses.map((expense) => ({ domain: expense, vm: mapRetirementExpenseToVM(expense) }))
      : [],
    eventItems: plan
      ? plan.events.map((event) => ({ domain: event, vm: mapRetirementEventToVM(event) }))
      : [],
    projectionVM,
    loading,
    error,
    isEditingName,
    editedName,
    setEditedName,
    setIsEditingName,
    staleIncomeSyncBanner,
    handleApplyStaleIncomeSync,
    handleDismissStaleIncomeSync,
    handleUpdatePlan,
    handleToggleAutoUpdate,
    handleRecalculate,
    handleAddExpense,
    handleUpdateExpense,
    handleDeleteExpense,
    handleImportDebtRepayments,
    handleAddEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleDelete,
    handleSaveName,
    handleCancelEditName,
    handleAddIncome,
    handleUpdateIncome,
    handleDeleteIncome,
    handleImportIncomeFromTransactions,
    handleImportExpensesFromLedger,
  };
};
