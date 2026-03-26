import { useCallback, useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  calculateProjectionSummary,
  calculateRetirementProjection,
} from '@/domains/retirement/logic/retirementCalculator';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementOneTimeEvent,
  type RetirementPlan,
  type RetirementPlanCreate,
} from '@/domains/retirement/types';
import { useRetirementPlanCmds } from '@/ui/features/retirement/hooks/useRetirementPlanCmds';
import { useRetirementPlans } from '@/ui/features/retirement/hooks/useRetirementPlans';
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
  const navigate = useNavigate();
  const [plan, setPlan] = useState<RetirementPlan | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  const { getPlan, loading: planLoading, error: planError } = useRetirementPlans(householdId);
  const { updatePlan, deletePlan, importData } = useRetirementPlanCmds(householdId, userEmail);

  const loadPlanToken = plan?.updatedAt?.getTime();

  const loadPlan = useCallback(async () => {
    if (!id || !householdId) return;
    const data = await getPlan(id);
    if (data) {
      setPlan(data);
      setEditedName(data.name);
    }
  }, [id, householdId, getPlan]);

  useEffect(() => {
    const init = async () => {
      await loadPlan();
    };
    init();
  }, [loadPlan, loadPlanToken]);

  const handleUpdatePlan = async (updates: Partial<RetirementPlanCreate>) => {
    if (!id || !plan) return;
    try {
      await updatePlan(id, updates);
      await loadPlan();
    } catch (error) {
      console.error('Failed to update plan', error);
    }
  };

  const handleToggleAutoUpdate = async () => {
    if (!id || !plan) return;
    await handleUpdatePlan({ autoUpdate: !plan.autoUpdate });
  };

  const handleRecalculate = async () => {
    if (!id || !plan) return;
    try {
      const projection = calculateRetirementProjection(plan);
      const summary = calculateProjectionSummary(projection, plan);

      await updatePlan(id, {
        summary: {
          ...summary,
          lastCalculatedAt: new Date(),
        },
      });
      await loadPlan();
    } catch (error) {
      console.error('Failed to recalculate', error);
    }
  };

  const handleAddExpense = async (expenseData: Omit<RetirementExpenseCategory, 'id'>) => {
    if (!id || !plan) return;
    const newExpense = { ...expenseData, id: crypto.randomUUID() };
    await handleUpdatePlan({
      expenses: [...plan.expenses, newExpense as RetirementExpenseCategory],
    });
  };

  const handleUpdateExpense = async (
    expenseId: string,
    updates: Omit<RetirementExpenseCategory, 'id'>,
  ) => {
    if (!id || !plan) return;
    await handleUpdatePlan({
      expenses: plan.expenses.map((e) => (e.id === expenseId ? { ...updates, id: e.id } : e)),
    });
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!id || !plan) return;
    if (!window.confirm('Are you sure you want to delete this expense category?')) return;
    await handleUpdatePlan({
      expenses: plan.expenses.filter((e) => e.id !== expenseId),
    });
  };

  const handleImportFromProjects = async () => {
    if (!id || !plan) return;

    const imported = await importData('projects', 12);
    const importedExpenses = (imported as RetirementExpenseCategory[]).filter(
      (item) =>
        typeof item.baseAmount === 'number' && typeof item.retirementMultiplier === 'number',
    );

    if (importedExpenses.length === 0) {
      return;
    }

    const merged = [...plan.expenses];
    for (const importedExpense of importedExpenses) {
      const matchIndex = merged.findIndex(
        (existing) =>
          existing.sourceProjectId && existing.sourceProjectId === importedExpense.sourceProjectId,
      );

      if (matchIndex >= 0) {
        merged[matchIndex] = {
          ...merged[matchIndex],
          ...importedExpense,
          id: merged[matchIndex].id,
        };
      } else {
        merged.push(importedExpense);
      }
    }

    await handleUpdatePlan({ expenses: merged });
  };

  const handleAddEvent = async (eventData: Omit<RetirementOneTimeEvent, 'id'>) => {
    if (!id || !plan) return;
    const newEvent = { ...eventData, id: crypto.randomUUID() };
    await handleUpdatePlan({
      events: [...plan.events, newEvent as RetirementOneTimeEvent],
    });
  };

  const handleUpdateEvent = async (
    eventId: string,
    updates: Omit<RetirementOneTimeEvent, 'id'>,
  ) => {
    if (!id || !plan) return;
    await handleUpdatePlan({
      events: plan.events.map((e) => (e.id === eventId ? { ...updates, id: e.id } : e)),
    });
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!id || !plan) return;
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    await handleUpdatePlan({
      events: plan.events.filter((e) => e.id !== eventId),
    });
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Delete this plan?')) return;
    try {
      await deletePlan(id);
      navigate('/retirement');
    } catch (error) {
      console.error('Failed to delete plan', error);
    }
  };

  const handleSaveName = async () => {
    if (!id || !plan || !editedName.trim()) return;
    await handleUpdatePlan({
      name: editedName.trim(),
    });
    setIsEditingName(false);
  };

  const handleCancelEditName = () => {
    setEditedName(plan?.name || '');
    setIsEditingName(false);
  };

  const handleAddIncome = async (incomeData: Omit<RetirementIncomeSource, 'id'>) => {
    if (!id || !plan) return;
    const newIncome = { ...incomeData, id: crypto.randomUUID() };
    await handleUpdatePlan({
      incomes: [...plan.incomes, newIncome as RetirementIncomeSource],
    });
  };

  const handleUpdateIncome = async (
    incomeId: string,
    updates: Omit<RetirementIncomeSource, 'id'>,
  ) => {
    if (!id || !plan) return;
    await handleUpdatePlan({
      incomes: plan.incomes.map((i) => (i.id === incomeId ? { ...updates, id: i.id } : i)),
    });
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (!id || !plan) return;
    if (!window.confirm('Are you sure you want to delete this income source?')) return;
    await handleUpdatePlan({
      incomes: plan.incomes.filter((i) => i.id !== incomeId),
    });
  };

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
    projectionVM: plan ? mapRetirementProjectionToVM(plan) : null,
    loading: planLoading,
    error: planError,
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
    handleImportFromProjects,
    handleAddEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleDelete,
    handleSaveName,
    handleCancelEditName,
    handleAddIncome,
    handleUpdateIncome,
    handleDeleteIncome,
    handleImportData: importData,
  };
};
