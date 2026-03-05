import { startOfMonth, subMonths } from 'date-fns';
import { Timestamp, orderBy, where } from 'firebase/firestore';

import type { FinancialReport } from '@/domains/finance/types';
import type { ProjectSnapshot } from '@/domains/project/types';
import {
  calculateExpenseSuggestion,
  calculateIncomeImportMetadata,
  calculateIncomeSourceSuggestions,
  processAutoUpdate,
} from '@/domains/retirement/logic/retirementPlanLogic';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementOneTimeEvent,
  type RetirementPlan,
  type RetirementPlanCreate,
} from '@/domains/retirement/types';
import { projectSnapshotRepository } from '@/repositories/projectSnapshotRepository';
import { reportRepository } from '@/repositories/reportRepository';
import { retirementPlanRepository } from '@/repositories/retirementPlanRepository';

import { type AuthContext, householdService } from './householdService';
import { plannedIncomeService } from './plannedIncomeService';
import { projectService } from './projectService';

class RetirementPlanService {
  // Get all plans for a household
  async getRetirementPlans(householdId: string): Promise<RetirementPlan[]> {
    return retirementPlanRepository.list([householdId], [orderBy('updatedAt', 'desc')]);
  }

  // Create a new plan
  async createRetirementPlan(
    householdId: string,
    plan: RetirementPlanCreate,
    userEmail: string,
    auth: AuthContext,
  ): Promise<string> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return retirementPlanRepository.create([householdId], plan, userEmail);
  }

  // Get a single plan
  async getRetirementPlan(householdId: string, planId: string): Promise<RetirementPlan | null> {
    return retirementPlanRepository.get([householdId, planId]);
  }

  // Update a plan
  async updateRetirementPlan(
    householdId: string,
    planId: string,
    updates: Partial<RetirementPlanCreate>,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return retirementPlanRepository.update([householdId, planId], updates, userEmail);
  }

  // Delete a plan
  async deleteRetirementPlan(
    householdId: string,
    planId: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    return retirementPlanRepository.delete([householdId, planId]);
  }

  // --- Collection Management ---

  async addExpense(
    householdId: string,
    planId: string,
    expenseData: Omit<RetirementExpenseCategory, 'id'>,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    const plan = await this.getRetirementPlan(householdId, planId);
    if (!plan) throw new Error('Plan not found');

    const newExpense = { ...expenseData, id: crypto.randomUUID() };
    await this.updateRetirementPlan(
      householdId,
      planId,
      {
        expenses: [...plan.expenses, newExpense],
      },
      userEmail,
      auth,
    );
  }

  async updateExpense(
    householdId: string,
    planId: string,
    expenseId: string,
    updates: Omit<RetirementExpenseCategory, 'id'>,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    const plan = await this.getRetirementPlan(householdId, planId);
    if (!plan) throw new Error('Plan not found');

    const updatedExpenses = plan.expenses.map((e: RetirementExpenseCategory) =>
      e.id === expenseId ? { ...updates, id: expenseId } : e,
    );
    await this.updateRetirementPlan(
      householdId,
      planId,
      { expenses: updatedExpenses },
      userEmail,
      auth,
    );
  }

  async deleteExpense(
    householdId: string,
    planId: string,
    expenseId: string,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    const plan = await this.getRetirementPlan(householdId, planId);
    if (!plan) throw new Error('Plan not found');

    const updatedExpenses = plan.expenses.filter(
      (e: RetirementExpenseCategory) => e.id !== expenseId,
    );
    await this.updateRetirementPlan(
      householdId,
      planId,
      { expenses: updatedExpenses },
      userEmail,
      auth,
    );
  }

  async addIncome(
    householdId: string,
    planId: string,
    incomeData: Omit<RetirementIncomeSource, 'id'>,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    const plan = await this.getRetirementPlan(householdId, planId);
    if (!plan) throw new Error('Plan not found');

    const newIncome = { ...incomeData, id: crypto.randomUUID() };
    await this.updateRetirementPlan(
      householdId,
      planId,
      {
        incomes: [...plan.incomes, newIncome],
      },
      userEmail,
      auth,
    );
  }

  async updateIncome(
    householdId: string,
    planId: string,
    incomeId: string,
    updates: Omit<RetirementIncomeSource, 'id'>,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    const plan = await this.getRetirementPlan(householdId, planId);
    if (!plan) throw new Error('Plan not found');

    const updatedIncomes = plan.incomes.map((i: RetirementIncomeSource) =>
      i.id === incomeId ? { ...updates, id: incomeId } : i,
    );
    await this.updateRetirementPlan(
      householdId,
      planId,
      { incomes: updatedIncomes },
      userEmail,
      auth,
    );
  }

  async deleteIncome(
    householdId: string,
    planId: string,
    incomeId: string,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    const plan = await this.getRetirementPlan(householdId, planId);
    if (!plan) throw new Error('Plan not found');

    const updatedIncomes = plan.incomes.filter((i: RetirementIncomeSource) => i.id !== incomeId);
    await this.updateRetirementPlan(
      householdId,
      planId,
      { incomes: updatedIncomes },
      userEmail,
      auth,
    );
  }

  async addEvent(
    householdId: string,
    planId: string,
    eventData: Omit<RetirementOneTimeEvent, 'id'>,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    const plan = await this.getRetirementPlan(householdId, planId);
    if (!plan) throw new Error('Plan not found');

    const newEvent = { ...eventData, id: `event-${Date.now()}` };
    await this.updateRetirementPlan(
      householdId,
      planId,
      {
        events: [...plan.events, newEvent],
      },
      userEmail,
      auth,
    );
  }

  async updateEvent(
    householdId: string,
    planId: string,
    eventId: string,
    updates: Omit<RetirementOneTimeEvent, 'id'>,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    const plan = await this.getRetirementPlan(householdId, planId);
    if (!plan) throw new Error('Plan not found');

    const updatedEvents = plan.events.map((e: RetirementOneTimeEvent) =>
      e.id === eventId ? { ...updates, id: eventId } : e,
    );
    await this.updateRetirementPlan(
      householdId,
      planId,
      { events: updatedEvents },
      userEmail,
      auth,
    );
  }

  async deleteEvent(
    householdId: string,
    planId: string,
    eventId: string,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    const plan = await this.getRetirementPlan(householdId, planId);
    if (!plan) throw new Error('Plan not found');

    const updatedEvents = plan.events.filter((e: RetirementOneTimeEvent) => e.id !== eventId);
    await this.updateRetirementPlan(
      householdId,
      planId,
      { events: updatedEvents },
      userEmail,
      auth,
    );
  }

  // --- Import Logic ---

  /**
   * Import expenses from Projects based on snapshots from the last N months.
   */
  async importFromProjects(
    householdId: string,
    referenceMonths: number = 12,
  ): Promise<RetirementExpenseCategory[]> {
    // 1. Get all active projects
    const projects = await projectService.getProjects(householdId);
    const activeProjects = projects.filter((p) => p.isActive);

    // 2. Calculate date range
    const endDate = new Date();
    const startDate = startOfMonth(subMonths(endDate, referenceMonths));

    // 3. Fetch snapshots for all projects in parallel
    const expenseCategories: RetirementExpenseCategory[] = [];

    await Promise.all(
      activeProjects.map(async (project) => {
        // Fetch snapshots
        const snapshots: ProjectSnapshot[] = await projectSnapshotRepository.list(
          [householdId, project.id],
          [
            where('year', '>=', startDate.getFullYear()),
            where('month', '>=', startDate.getMonth() + 1),
          ],
        );

        // Filter snapshots within range
        const validSnapshots = snapshots.filter((s) => {
          const snapshotDate = new Date(s.year, s.month - 1);
          return snapshotDate >= startDate && snapshotDate <= endDate;
        });

        if (validSnapshots.length === 0) return;
        const suggestion = calculateExpenseSuggestion(project, validSnapshots);
        if (suggestion) expenseCategories.push(suggestion);
      }),
    );

    return expenseCategories;
  }

  /**
   * Import income sources from PlannedIncome from the last N months.
   */
  async importFromPlannedIncome(
    householdId: string,
    referenceMonths: number = 12,
  ): Promise<RetirementIncomeSource[]> {
    // 1. Get planned incomes
    const plannedIncomes = await plannedIncomeService.getPlannedIncomes(householdId);

    // 2. Calculate date range
    const endDate = new Date();
    const startDate = startOfMonth(subMonths(endDate, referenceMonths));

    // 3. Filter and Group
    const validIncomes = plannedIncomes.filter((pi) => {
      const date = pi.date instanceof Timestamp ? pi.date.toDate() : pi.date;
      return date >= startDate && date <= endDate;
    });

    return calculateIncomeSourceSuggestions(validIncomes, referenceMonths);
  }

  /**
   * Get detailed planned income import data for a specific category and date range.
   */
  async getPlannedIncomeImportData(
    householdId: string,
    category: string,
    startDateStr?: string,
    endDateStr?: string,
  ): Promise<RetirementIncomeSource['calculatedFrom'] | null> {
    const plannedIncomes = await plannedIncomeService.getPlannedIncomes(householdId);

    const startDate = startDateStr ? new Date(startDateStr) : null;
    const endDate = endDateStr ? new Date(endDateStr) : null;

    const validIncomes = plannedIncomes.filter((pi) => {
      const date = pi.date instanceof Timestamp ? pi.date.toDate() : pi.date;
      const matchesCategory = pi.category.toLowerCase() === category.toLowerCase();
      const matchesStart = !startDate || date >= startDate;
      const matchesEnd = !endDate || date <= endDate;
      return matchesCategory && matchesStart && matchesEnd;
    });

    if (validIncomes.length === 0) return null;
    return calculateIncomeImportMetadata(validIncomes);
  }

  /**
   * Get total planned income for a specific year and category.
   */
  async getYearlyPlannedIncomeTotal(
    householdId: string,
    year: number,
    category: string,
  ): Promise<number> {
    const plannedIncomes = await plannedIncomeService.getPlannedIncomes(householdId);

    // Filter by year and category
    const validIncomes = plannedIncomes.filter((pi) => {
      const date = pi.date instanceof Timestamp ? pi.date.toDate() : pi.date;
      return date.getFullYear() === year && pi.category.toLowerCase() === category.toLowerCase();
    });

    return validIncomes.reduce((sum, pi) => sum + pi.amount, 0);
  }

  /**
   * Get total expense for a specific project and year.
   */
  async getProjectYearlyExpense(
    householdId: string,
    projectId: string,
    year: number,
  ): Promise<number> {
    const snapshots = await projectSnapshotRepository.list(
      [householdId, projectId],
      [where('year', '==', year)],
    );
    return snapshots.reduce((sum, s) => sum + s.expense, 0);
  }

  async getProjectYearlyIncome(
    householdId: string,
    projectId: string,
    year: number,
  ): Promise<number> {
    const snapshots = await projectSnapshotRepository.list(
      [householdId, projectId],
      [where('year', '==', year)],
    );
    return snapshots.reduce((sum, s) => sum + (s.income || 0), 0);
  }

  /**
   * Automatically update plan settings based on last 12 months of financial data.
   */
  async autoUpdatePlan(
    householdId: string,
    planId: string,
    userEmail: string,
    auth: AuthContext,
  ): Promise<void> {
    await householdService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    const plan = await this.getRetirementPlan(householdId, planId);
    if (!plan) throw new Error('Plan not found');

    // 1. Fetch all reports to find the latest 12 months
    const reports: FinancialReport[] = await reportRepository.list([householdId]);

    // 2. Identify the latest 12 unique month/year periods available
    const uniquePeriods = Array.from(new Set(reports.map((r) => `${r.year}-${r.month}`)))
      .map((p) => {
        const [year, month] = p.split('-').map(Number);
        return { year, month };
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);

    if (uniquePeriods.length < 12) {
      throw new Error(
        `Insufficient data: Found only ${uniquePeriods.length} months of reports, need at least 12.`,
      );
    }

    const latest12Periods = uniquePeriods.slice(0, 12);
    const latestPeriod = latest12Periods[0];

    // 3. Filter reports for these 12 periods
    const flowReports: FinancialReport[] = reports.filter((r) =>
      latest12Periods.some((p) => p.year === r.year && p.month === r.month),
    );

    // 4. Calculate updates via domain logic
    const updates = processAutoUpdate(plan, flowReports, latestPeriod);

    // 5. Update plan
    await this.updateRetirementPlan(householdId, planId, updates, userEmail, auth);
  }
}

export const retirementPlanService = new RetirementPlanService();
