import { useCallback, useEffect, useState } from 'react';
import { useMemo } from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/contexts/useAuth';
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
import { retirementPlanService } from '@/services/retirementPlanService';

import { useRetirementPlanCmds } from '../useRetirementPlanCmds';

export const useRetirementPlanDetailPage = (
  id: string | undefined,
  householdId: string | undefined,
  userEmail: string | undefined,
) => {
  const { currentUser, isAdmin } = useAuth();
  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser, isAdmin],
  );
  const navigate = useNavigate();
  const [plan, setPlan] = useState<RetirementPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  const {
    updatePlan,
    deletePlan,
    addExpense,
    updateExpense,
    deleteExpense,
    addIncome,
    updateIncome,
    deleteIncome,
    addEvent,
    updateEvent,
    deleteEvent,
  } = useRetirementPlanCmds(householdId, userEmail);

  const loadPlan = useCallback(async () => {
    if (!id || !householdId) return;
    try {
      const data = await retirementPlanService.getRetirementPlan(householdId, id);
      if (data) {
        setPlan(data);
        setEditedName(data.name);
      }
    } catch (error) {
      console.error('Failed to load plan', error);
    } finally {
      setLoading(false);
    }
  }, [id, householdId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const handleUpdatePlan = async (updates: Partial<RetirementPlanCreate>) => {
    if (!id || !householdId || !plan) return;
    try {
      await updatePlan(id, updates);
      await loadPlan();
    } catch (error) {
      console.error('Failed to update plan', error);
    }
  };

  const handleToggleAutoUpdate = async () => {
    if (!id || !householdId || !plan) return;
    try {
      await updatePlan(id, { autoUpdate: !plan.autoUpdate });
      await loadPlan();
    } catch (error) {
      console.error('Failed to toggle auto-update', error);
    }
  };

  const handleRecalculate = async () => {
    if (!id || !householdId || !plan) return;
    try {
      // 1. Trigger auto-update if enabled
      if (plan.autoUpdate) {
        await retirementPlanService.autoUpdatePlan(householdId, id, userEmail || '', auth);
        // Reload plan after service-side updates
        const updatedData = await retirementPlanService.getRetirementPlan(householdId, id);
        if (updatedData) {
          setPlan(updatedData);
        }
      }

      // 2. Fetch the potentially updated plan again for projection calculation
      const currentPlan = await retirementPlanService.getRetirementPlan(householdId, id);
      if (!currentPlan) return;

      const projection = calculateRetirementProjection(currentPlan);
      const summary = calculateProjectionSummary(projection, currentPlan);

      await updatePlan(id, {
        summary: {
          ...summary,
          lastCalculatedAt: new Date(),
        },
      });
      await loadPlan();
    } catch (error) {
      console.error('Failed to recalculate', error);
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  const handleAddExpense = async (expenseData: Omit<RetirementExpenseCategory, 'id'>) => {
    if (!id || !householdId) return;
    try {
      await addExpense(id, expenseData);
      await loadPlan();
    } catch (error) {
      console.error('Failed to add expense:', error);
    }
  };

  const handleUpdateExpense = async (
    expenseId: string,
    updates: Omit<RetirementExpenseCategory, 'id'>,
  ) => {
    if (!id || !householdId) return;
    try {
      await updateExpense(id, expenseId, updates);
      await loadPlan();
    } catch (error) {
      console.error('Failed to update expense:', error);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!id || !householdId) return;
    if (!window.confirm('Are you sure you want to delete this expense category?')) return;

    try {
      await deleteExpense(id, expenseId);
      await loadPlan();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  const handleAddEvent = async (eventData: Omit<RetirementOneTimeEvent, 'id'>) => {
    if (!id || !householdId) return;
    try {
      await addEvent(id, eventData);
      await loadPlan();
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  };

  const handleUpdateEvent = async (
    eventId: string,
    updates: Omit<RetirementOneTimeEvent, 'id'>,
  ) => {
    if (!id || !householdId) return;
    try {
      await updateEvent(id, eventId, updates);
      await loadPlan();
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!id || !householdId) return;
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      await deleteEvent(id, eventId);
      await loadPlan();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleDelete = async () => {
    if (!id || !householdId || !window.confirm('Delete this plan?')) return;
    try {
      await deletePlan(id);
      navigate('/retirement');
    } catch (error) {
      console.error('Failed to delete plan', error);
    }
  };

  const handleSaveName = async () => {
    if (!id || !householdId || !plan || !editedName.trim()) return;
    try {
      await updatePlan(id, {
        name: editedName.trim(),
      });
      await loadPlan();
      setIsEditingName(false);
    } catch (error) {
      console.error('Failed to update plan name', error);
    }
  };

  const handleCancelEditName = () => {
    setEditedName(plan?.name || '');
    setIsEditingName(false);
  };

  const handleAddIncome = async (incomeData: Omit<RetirementIncomeSource, 'id'>) => {
    if (!id || !householdId) return;
    try {
      await addIncome(id, incomeData);
      await loadPlan();
    } catch (error) {
      console.error('Failed to add income:', error);
    }
  };

  const handleUpdateIncome = async (
    incomeId: string,
    updates: Omit<RetirementIncomeSource, 'id'>,
  ) => {
    if (!id || !householdId) return;
    try {
      await updateIncome(id, incomeId, updates);
      await loadPlan();
    } catch (error) {
      console.error('Failed to update income:', error);
    }
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (!id || !householdId) return;
    if (!window.confirm('Are you sure you want to delete this income source?')) return;

    try {
      await deleteIncome(id, incomeId);
      await loadPlan();
    } catch (error) {
      console.error('Failed to delete income:', error);
    }
  };

  return {
    plan,
    loading,
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
    handleAddEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleDelete,
    handleSaveName,
    handleCancelEditName,
    handleAddIncome,
    handleUpdateIncome,
    handleDeleteIncome,
  };
};
