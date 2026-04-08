import { Timestamp } from 'firebase/firestore';
import {
  type MonthlyBudget,
  type MonthlyBudgetStats,
  type IncomeCategory,
  type Project,
  type Transaction,
  type ProjectTransaction,
} from '../../../schemas';

/**
 * Pure function to calculate the monthly budget.
 */
export function calculateMonthlyBudget(
  householdId: string,
  year: number,
  month: number,
  projects: Project[],
  projectTransactions: ProjectTransaction[],
  transactions: Transaction[],
  incomeTransactions: Transaction[]
): MonthlyBudget {
  // Calculate income breakdown by category
  const incomeBreakdown: Record<IncomeCategory, number> = {
    salary: 0,
    bonus: 0,
    investment: 0,
    other: 0,
  };

  incomeTransactions.forEach((t) => {
    const category = t.category as IncomeCategory;
    if (category in incomeBreakdown) {
      incomeBreakdown[category] += t.amount;
    } else {
      incomeBreakdown['other'] += t.amount;
    }
  });

  const totalIncome = Object.values(incomeBreakdown).reduce((sum, val) => sum + val, 0);

  // Calculate budget for each project category
  const budgets: MonthlyBudget['budgets'] = {};

  for (const project of projects) {
    // Sum allocations to this project
    const allocated = projectTransactions
      .filter((pt) => pt.toProject === project.id)
      .reduce((sum, pt) => sum + pt.amount, 0);

    // Sum expenses for this project
    const spent = transactions
      .filter((t) => t.projectId === project.id)
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
}

/**
 * Pure function to calculate monthly budget statistics.
 */
export function calculateMonthlyStats(monthlyBudget: MonthlyBudget): MonthlyBudgetStats {
  const stats = Object.entries(monthlyBudget.budgets).map(([projectId, data]) => ({
    category: projectId, // This is the ID, UI should map to name
    percentage:
      monthlyBudget.totalIncome > 0 ? (data.allocated / monthlyBudget.totalIncome) * 100 : 0,
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
}
