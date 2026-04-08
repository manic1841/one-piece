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
import { projectTransactionService } from './projectTransactionService';
import { parseWithSchema } from '../schemas';
import { calculateMonthlyBudget, calculateMonthlyStats } from '../domains/finance/calculators/budgetCalculator';

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

  // Calculate monthly budget based on allocated income and expenses
  async calculateMonthlyBudget(
    householdId: string,
    year: number,
    month: number,
  ): Promise<MonthlyBudget> {
    // Get projects
    const projects = await projectService.getProjects(householdId);

    // Define date range
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // 1. Get Allocated Amounts from ProjectTransactions (Income allocated to projects)
    const projectTransactions = await projectTransactionService.getProjectTransactions(
      householdId,
      {
        startDate: startDateStr,
        endDate: endDateStr,
      },
    );

    // 2. Get Spent Amounts from Transactions (Expenses)
    const transactions = await transactionService.getTransactions(householdId, {
      startDate: startDateStr,
      endDate: endDateStr,
      type: 'expense',
    });

    // 3. Get Income Transactions for Breakdown
    const incomeTransactions = await transactionService.getTransactions(householdId, {
      startDate: startDateStr,
      endDate: endDateStr,
      type: 'income',
    });

    return calculateMonthlyBudget(
      householdId,
      year,
      month,
      projects,
      projectTransactions,
      transactions,
      incomeTransactions
    );
  },

  // Get monthly statistics (budget vs actual)
  async getMonthlyStats(
    householdId: string,
    year: number,
    month: number,
  ): Promise<MonthlyBudgetStats> {
    const monthlyBudget = await this.calculateMonthlyBudget(householdId, year, month);
    return calculateMonthlyStats(monthlyBudget);
  },
};
