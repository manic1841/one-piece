import type { IncomeStatementData, IncomeStatementItem } from '@/domains/finance/types';
import type { ProjectWithSnapshot } from '@/domains/project/types';
import type { PlannedIncome } from '@/domains/record/types';

import { IncomeStatementCategory } from '../types/category';

export function calculateIncomeStatement(
  plannedIncomes: PlannedIncome[],
  projectWithSnapshots: ProjectWithSnapshot[],
): IncomeStatementData {
  // 1. Calculate Revenue
  const revenueItems: IncomeStatementItem[] = [];

  // Planned Income - Split by category
  // Salary
  const salaryIncomes = plannedIncomes.filter((pi) => pi.category.toLowerCase() === 'salary');
  const salaryTotal = salaryIncomes.reduce((sum, pi) => sum + pi.amount, 0);
  if (salaryTotal > 0) {
    revenueItems.push({
      category: 'Salary',
      amount: salaryTotal,
      subItems: salaryIncomes.map((pi) => ({ name: pi.category, amount: pi.amount })),
    });
  }

  // Bonus
  const bonusIncomes = plannedIncomes.filter((pi) => pi.category.toLowerCase() === 'bonus');
  const bonusTotal = bonusIncomes.reduce((sum, pi) => sum + pi.amount, 0);
  if (bonusTotal > 0) {
    revenueItems.push({
      category: 'Bonus',
      amount: bonusTotal,
      subItems: bonusIncomes.map((pi) => ({ name: pi.category, amount: pi.amount })),
    });
  }

  // Other Incomes
  const otherIncomes = projectWithSnapshots.filter(
    (pws) => pws.accounting?.incomeStatement?.category === IncomeStatementCategory.INCOME,
  );
  const otherIncomeTotal = otherIncomes.reduce((sum, pws) => {
    const snapshot = pws.snapshot;
    if (!snapshot) return sum;
    return sum + snapshot.income;
  }, 0);
  if (otherIncomeTotal > 0) {
    revenueItems.push({
      category: 'Other Income',
      amount: otherIncomeTotal,
      subItems: otherIncomes.map((pws) => {
        if (!pws.snapshot) return { name: pws.name, amount: 0 };
        return { name: pws.name, amount: pws.snapshot.income };
      }),
    });
  }

  const totalRevenue = revenueItems.reduce((sum, item) => sum + item.amount, 0);

  // 2. Calculate Project Accounting Expenses and Other Income
  const expenseItems: IncomeStatementItem[] = [];

  const projectExpenses = projectWithSnapshots.filter(
    (pws) => pws.accounting?.incomeStatement?.category === IncomeStatementCategory.EXPENSE,
  );
  const projectExpensesTotal = projectExpenses.reduce((sum, pws) => {
    const snapshot = pws.snapshot;
    if (!snapshot) return sum;
    return sum + snapshot.expense;
  }, 0);
  if (projectExpensesTotal > 0) {
    expenseItems.push({
      category: 'Project Expenses',
      amount: projectExpensesTotal,
      subItems: projectExpenses.map((pws) => {
        if (!pws.snapshot) return { name: pws.name, amount: 0 };
        return { name: pws.name, amount: pws.snapshot.expense };
      }),
    });
  }

  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    revenue: {
      total: totalRevenue,
      items: revenueItems,
    },
    expenses: {
      total: totalExpenses,
      items: expenseItems,
    },
    netIncome: totalRevenue - totalExpenses,
  };
}
