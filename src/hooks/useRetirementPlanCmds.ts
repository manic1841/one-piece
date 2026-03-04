import { useCallback } from 'react';

import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementOneTimeEvent,
  type RetirementPlanCreate,
} from '@/domains/retirement/types';
import { retirementPlanService } from '@/services/retirementPlanService';

export const useRetirementPlanCmds = (householdId?: string, email?: string) => {
  const createPlan = useCallback(
    async (planCode: RetirementPlanCreate) => {
      if (!householdId || !email) return;
      return await retirementPlanService.createRetirementPlan(householdId, planCode, email);
    },
    [householdId, email],
  );

  const updatePlan = useCallback(
    async (id: string, updates: Partial<RetirementPlanCreate>) => {
      if (!householdId || !email) return;
      await retirementPlanService.updateRetirementPlan(householdId, id, updates, email);
    },
    [householdId, email],
  );

  const deletePlan = useCallback(
    async (id: string) => {
      if (!householdId) return;
      await retirementPlanService.deleteRetirementPlan(householdId, id);
    },
    [householdId],
  );

  const addExpense = useCallback(
    async (planId: string, expenseData: Omit<RetirementExpenseCategory, 'id'>) => {
      if (!householdId || !email) return;
      await retirementPlanService.addExpense(householdId, planId, expenseData, email);
    },
    [householdId, email],
  );

  const updateExpense = useCallback(
    async (planId: string, expenseId: string, updates: Omit<RetirementExpenseCategory, 'id'>) => {
      if (!householdId || !email) return;
      await retirementPlanService.updateExpense(householdId, planId, expenseId, updates, email);
    },
    [householdId, email],
  );

  const deleteExpense = useCallback(
    async (planId: string, expenseId: string) => {
      if (!householdId || !email) return;
      await retirementPlanService.deleteExpense(householdId, planId, expenseId, email);
    },
    [householdId, email],
  );

  const addIncome = useCallback(
    async (planId: string, incomeData: Omit<RetirementIncomeSource, 'id'>) => {
      if (!householdId || !email) return;
      await retirementPlanService.addIncome(householdId, planId, incomeData, email);
    },
    [householdId, email],
  );

  const updateIncome = useCallback(
    async (planId: string, incomeId: string, updates: Omit<RetirementIncomeSource, 'id'>) => {
      if (!householdId || !email) return;
      await retirementPlanService.updateIncome(householdId, planId, incomeId, updates, email);
    },
    [householdId, email],
  );

  const deleteIncome = useCallback(
    async (planId: string, incomeId: string) => {
      if (!householdId || !email) return;
      await retirementPlanService.deleteIncome(householdId, planId, incomeId, email);
    },
    [householdId, email],
  );

  const addEvent = useCallback(
    async (planId: string, eventData: Omit<RetirementOneTimeEvent, 'id'>) => {
      if (!householdId || !email) return;
      await retirementPlanService.addEvent(householdId, planId, eventData, email);
    },
    [householdId, email],
  );

  const updateEvent = useCallback(
    async (planId: string, eventId: string, updates: Omit<RetirementOneTimeEvent, 'id'>) => {
      if (!householdId || !email) return;
      await retirementPlanService.updateEvent(householdId, planId, eventId, updates, email);
    },
    [householdId, email],
  );

  const deleteEvent = useCallback(
    async (planId: string, eventId: string) => {
      if (!householdId || !email) return;
      await retirementPlanService.deleteEvent(householdId, planId, eventId, email);
    },
    [householdId, email],
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
