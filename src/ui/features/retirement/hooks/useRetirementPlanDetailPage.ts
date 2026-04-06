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
    isEditingName,
    editedName,
    setEditedName,
    setIsEditingName,
    handleUpdatePlan,
    handleToggleAutoUpdate,
    handleRecalculate,
    handleDelete,
    handleSaveName,
    handleCancelEditName,
    importData,
  } = useRetirementPlanCore({ id, householdId, userEmail });

  const { handleAddExpense, handleUpdateExpense, handleDeleteExpense, handleImportDebtRepayments } =
    useRetirementExpenseActions({
      id,
      plan,
      importData,
      handleUpdatePlan,
    });

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
    importData,
    handleUpdatePlan,
  });

  return {
    plan,
    headerVM: plan ? mapRetirementPlanToHeaderVM(plan) : null,
    assumptionsVM: plan ? mapRetirementPlanToAssumptionsDisplayVM(plan) : null,
    incomeItems: plan
      ? plan.incomes.map((income) => ({ domain: income, vm: mapRetirementIncomeToVM(income) }))
      : [],
    expenseItems: plan
      ? plan.expenses.map((expense) => ({ domain: expense, vm: mapRetirementExpenseToVM(expense) }))
      : [],
    eventItems: plan
      ? plan.events.map((event) => ({ domain: event, vm: mapRetirementEventToVM(event) }))
      : [],
    projectionVM: plan
      ? mapRetirementProjectionToVM(
          calculatePlanProjection(plan),
          plan.birthYear + plan.retirementAge,
          plan,
        )
      : null,
    loading,
    error,
    isEditingName,
    editedName,
    setEditedName,
    setIsEditingName,
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
    handleImportData: importData,
  };
};
