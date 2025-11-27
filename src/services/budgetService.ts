import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  BudgetAllocationsSchema,
  type BudgetAllocations,
  type IncomeBudgetAllocation,
  type MonthlyBudget,
  type MonthlyBudgetStats,
  type IncomeCategory,
} from '../schemas';
import { transactionService } from './transactionService';
import { projectService } from './projectService';
import { Timestamp } from 'firebase/firestore';
import { parseWithSchema } from '../schemas';

const DEFAULT_ALLOCATION: IncomeBudgetAllocation = {
  // Default to empty, will be populated by available projects
  savings: 100,
};

const DEFAULT_ALLOCATIONS: BudgetAllocations = {
  salary: { ...DEFAULT_ALLOCATION },
  bonus: { ...DEFAULT_ALLOCATION },
  investment: { ...DEFAULT_ALLOCATION },
  other: { ...DEFAULT_ALLOCATION },
};

export const budgetService = {
  // Get household's budget allocations
  async getBudgetAllocations(householdId: string): Promise<BudgetAllocations> {
    const householdRef = doc(db, 'households', householdId);
    const householdSnap = await getDoc(householdRef);

    if (householdSnap.exists()) {
      const data = householdSnap.data();
      // Use optional parsing or default if missing
      if (data.budgetAllocations) {
        return parseWithSchema(BudgetAllocationsSchema, data.budgetAllocations);
      }
    }

    return DEFAULT_ALLOCATIONS;
  },

  // Update household's budget allocations for a specific income source
  async updateBudgetAllocations(
    householdId: string,
    allocations: BudgetAllocations,
  ): Promise<void> {
    // Validate that each income source's allocations sum to 100%
    for (const incomeType of Object.keys(allocations) as IncomeCategory[]) {
      const allocation = allocations[incomeType];
      console.log('allocation', allocation);
      const total = (Object.values(allocation) as number[]).reduce(
        (sum: number, val: number) => sum + val,
        0,
      );
      if (Math.abs(total - 100) > 0.01) {
        throw new Error(
          `Budget allocations for ${incomeType} must sum to 100% (currently ${total.toFixed(1)}%)`,
        );
      }
    }

    const householdRef = doc(db, 'households', householdId);
    await updateDoc(householdRef, {
      budgetAllocations: allocations,
    });
  },

  // Calculate monthly budget based on income
  async calculateMonthlyBudget(
    householdId: string,
    year: number,
    month: number,
  ): Promise<MonthlyBudget> {
    // Get budget allocations
    const allocations = await this.getBudgetAllocations(householdId);

    // Get projects to ensure we have all categories
    const projects = await projectService.getProjects(householdId);

    // Get monthly transactions
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const allTransactions = await transactionService.getTransactions(householdId, {
      startDate: startDateStr,
      endDate: endDateStr,
    });

    // Calculate income breakdown by category
    const incomeBreakdown: Record<IncomeCategory, number> = {
      salary: 0,
      bonus: 0,
      investment: 0,
      other: 0,
    };

    allTransactions
      .filter((t) => t.type === 'income')
      .forEach((t) => {
        // Ensure category is a valid IncomeCategory
        // If not, it might be 'other' or we should handle it.
        // For now assuming it matches.
        const category = t.category as IncomeCategory;
        if (category in incomeBreakdown) {
          incomeBreakdown[category] += t.amount;
        } else {
          // Fallback to other if category not found in breakdown
          incomeBreakdown['other'] += t.amount;
        }
      });

    const totalIncome = Object.values(incomeBreakdown).reduce((sum, val) => sum + val, 0);

    // Calculate budget for each project category
    const budgets: MonthlyBudget['budgets'] = {};

    // Use project IDs as keys
    for (const project of projects) {
      let allocated = 0;

      // Sum up allocations from each income source
      for (const [incomeType, incomeAmount] of Object.entries(incomeBreakdown)) {
        const allocation = allocations[incomeType as IncomeCategory];
        // Use project ID to look up allocation, fallback to 0
        const percentage = allocation[project.id] || 0;
        allocated += (incomeAmount * percentage) / 100;
      }

      const spent = allTransactions
        .filter((t) => t.type === 'expense' && t.projectId === project.id)
        .reduce((sum, t) => sum + t.amount, 0);

      budgets[project.id] = {
        allocated,
        spent,
      };
    }

    return {
      householdId,
      year,
      month,
      totalIncome,
      incomeBreakdown,
      budgets,
      createdAt: Timestamp.now(),
    };
  },

  // Get monthly statistics (budget vs actual)
  async getMonthlyStats(
    householdId: string,
    year: number,
    month: number,
  ): Promise<MonthlyBudgetStats> {
    const monthlyBudget = await this.calculateMonthlyBudget(householdId, year, month);
    const allocations = await this.getBudgetAllocations(householdId);
    const projects = await projectService.getProjects(householdId);

    // Calculate average allocation percentage for each category
    const avgAllocations: Record<string, number> = {};

    for (const project of projects) {
      let totalPercentage = 0;
      let totalIncome = 0;

      for (const [incomeType, incomeAmount] of Object.entries(monthlyBudget.incomeBreakdown)) {
        if (incomeAmount > 0) {
          const allocation = allocations[incomeType as IncomeCategory];
          totalPercentage += (allocation[project.id] || 0) * incomeAmount;
          totalIncome += incomeAmount;
        }
      }

      avgAllocations[project.id] = totalIncome > 0 ? totalPercentage / totalIncome : 0;
    }

    const stats = Object.entries(monthlyBudget.budgets).map(([projectId, data]) => ({
      category: projectId, // This is the ID, UI should map to name
      percentage: avgAllocations[projectId] || 0,
      allocated: data.allocated,
      spent: data.spent,
      remaining: data.allocated - data.spent,
      percentageUsed: data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0,
      isOverBudget: data.spent > data.allocated,
    }));

    return {
      totalIncome: monthlyBudget.totalIncome,
      incomeBreakdown: monthlyBudget.incomeBreakdown,
      stats,
    };
  },
};
