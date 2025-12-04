import { orderBy, Timestamp, where } from 'firebase/firestore';

import {
  RetirementPlanSchema,
  type RetirementPlan,
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
} from '../schemas/retirementPlan';
import { BaseService } from './baseService';
import { projectService } from './projectService';
import { plannedIncomeService } from './plannedIncomeService';
import { subMonths, startOfMonth } from 'date-fns';
import { projectSnapshotRepository } from '@/repositories/projectSnapshotRepository';

class RetirementPlanService extends BaseService<RetirementPlan> {
  constructor() {
    super('retirementPlans', RetirementPlanSchema);
  }

  // Get all plans for a household
  async getRetirementPlans(householdId: string): Promise<RetirementPlan[]> {
    return this.getAll(householdId, [orderBy('updatedAt', 'desc')]);
  }

  // Create a new plan
  async createRetirementPlan(
    householdId: string,
    plan: Omit<RetirementPlan, 'id' | 'createdAt'>,
  ): Promise<string> {
    return this.create(householdId, plan);
  }

  // Update a plan
  async updateRetirementPlan(
    householdId: string,
    planId: string,
    updates: Partial<RetirementPlan>,
  ): Promise<void> {
    return this.update(householdId, planId, updates);
  }

  // Delete a plan
  async deleteRetirementPlan(householdId: string, planId: string): Promise<void> {
    return this.delete(householdId, planId);
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
        const snapshots = await projectSnapshotRepository.list(
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

        // Calculate average monthly expense
        const totalExpense = validSnapshots.reduce((sum, s) => sum + s.expense, 0);
        const averageMonthly = totalExpense / validSnapshots.length;
        const annualized = averageMonthly * 12;

        // Create category suggestion
        if (annualized > 0) {
          expenseCategories.push({
            id: crypto.randomUUID(), // Temporary ID
            name: project.name,
            sourceProjectId: project.id,
            baseAmount: Math.round(annualized),
            growthRate: 2, // Default inflation
            retirementMultiplier: 0.7, // Default assumption
            startYear: new Date().getFullYear(),
            endYear: null, // Lifetime
            note: `Based on ${validSnapshots.length} months average from ${project.name}`,
          });
        }
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

    const incomeMap = new Map<string, { total: number; count: number; type: string }>();

    validIncomes.forEach((pi) => {
      const key = pi.category; // Group by category (Salary, Bonus, etc.)
      const current = incomeMap.get(key) || { total: 0, count: 0, type: pi.category };

      current.total += pi.amount;
      current.count += 1;
      incomeMap.set(key, current);
    });

    const incomeSources: RetirementIncomeSource[] = [];
    const currentYear = new Date().getFullYear();

    incomeMap.forEach((value, key) => {
      const annualAmount = (value.total / referenceMonths) * 12;

      incomeSources.push({
        id: crypto.randomUUID(),
        name: key.charAt(0).toUpperCase() + key.slice(1),
        type: this.mapCategoryToType(key),
        startYear: currentYear,
        endYear: currentYear + 20, // Default 20 years work
        baseAmount: Math.round(annualAmount),
        growthRate: 3, // Default salary growth
        note: `Based on last ${referenceMonths} months records`,
      });
    });

    return incomeSources;
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

  private mapCategoryToType(category: string): 'salary' | 'bonus' | 'pension' | 'rent' | 'other' {
    const lower = category.toLowerCase();
    if (lower.includes('salary')) return 'salary';
    if (lower.includes('bonus')) return 'bonus';
    if (lower.includes('rent')) return 'rent';
    return 'other';
  }
}

export const retirementPlanService = new RetirementPlanService();
