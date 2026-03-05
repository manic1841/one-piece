import { useCallback, useMemo } from 'react';

import { useAuth } from '@/contexts/useAuth';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementOneTimeEvent,
  type RetirementPlanCreate,
} from '@/domains/retirement/types';
import { retirementPlanService } from '@/services/retirementPlanService';

export const useRetirementPlanCmds = (householdId?: string, email?: string) => {
  const { currentUser, isAdmin } = useAuth();
  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser, isAdmin],
  );

  const createPlan = useCallback(
    async (planCode: RetirementPlanCreate) => {
      if (!householdId || !email) return;
      return await retirementPlanService.createRetirementPlan(householdId, planCode, email, auth);
    },
    [householdId, email, auth],
  );

  const updatePlan = useCallback(
    async (id: string, updates: Partial<RetirementPlanCreate>) => {
      if (!householdId || !email) return;
      await retirementPlanService.updateRetirementPlan(householdId, id, updates, email, auth);
    },
    [householdId, email, auth],
  );

  const deletePlan = useCallback(
    async (id: string) => {
      if (!householdId) return;
      await retirementPlanService.deleteRetirementPlan(householdId, id, auth);
    },
    [householdId, auth],
  );

  const addExpense = useCallback(
    async (planId: string, expenseData: Omit<RetirementExpenseCategory, 'id'>) => {
      if (!householdId || !email) return;
      await retirementPlanService.addExpense(householdId, planId, expenseData, email, auth);
    },
    [householdId, email, auth],
  );

  const updateExpense = useCallback(
    async (planId: string, expenseId: string, updates: Omit<RetirementExpenseCategory, 'id'>) => {
      if (!householdId || !email) return;
      await retirementPlanService.updateExpense(
        householdId,
        planId,
        expenseId,
        updates,
        email,
        auth,
      );
    },
    [householdId, email, auth],
  );

  const deleteExpense = useCallback(
    async (planId: string, expenseId: string) => {
      if (!householdId || !email) return;
      await retirementPlanService.deleteExpense(householdId, planId, expenseId, email, auth);
    },
    [householdId, email, auth],
  );

  const addIncome = useCallback(
    async (planId: string, incomeData: Omit<RetirementIncomeSource, 'id'>) => {
      if (!householdId || !email) return;
      await retirementPlanService.addIncome(householdId, planId, incomeData, email, auth);
    },
    [householdId, email, auth],
  );

  const updateIncome = useCallback(
    async (planId: string, incomeId: string, updates: Omit<RetirementIncomeSource, 'id'>) => {
      if (!householdId || !email) return;
      await retirementPlanService.updateIncome(householdId, planId, incomeId, updates, email, auth);
    },
    [householdId, email, auth],
  );

  const deleteIncome = useCallback(
    async (planId: string, incomeId: string) => {
      if (!householdId || !email) return;
      await retirementPlanService.deleteIncome(householdId, planId, incomeId, email, auth);
    },
    [householdId, email, auth],
  );

  const addEvent = useCallback(
    async (planId: string, eventData: Omit<RetirementOneTimeEvent, 'id'>) => {
      if (!householdId || !email) return;
      await retirementPlanService.addEvent(householdId, planId, eventData, email, auth);
    },
    [householdId, email, auth],
  );

  const updateEvent = useCallback(
    async (planId: string, eventId: string, updates: Omit<RetirementOneTimeEvent, 'id'>) => {
      if (!householdId || !email) return;
      await retirementPlanService.updateEvent(householdId, planId, eventId, updates, email, auth);
    },
    [householdId, email, auth],
  );

  const deleteEvent = useCallback(
    async (planId: string, eventId: string) => {
      if (!householdId || !email) return;
      await retirementPlanService.deleteEvent(householdId, planId, eventId, email, auth);
    },
    [householdId, email, auth],
  );

  return {
    createPlan,
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
  };
};
