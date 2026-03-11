import type { IncomeStatementData, IncomeStatementItem } from '@/domains/finance/types';
import {
  ExpenseSubCategory,
  IncomeStatementCategory,
  IncomeSubCategory,
} from '@/domains/finance/types';
import type { ProjectWithSnapshot } from '@/domains/project/types';
import { ProjectExpenseBehavior, ProjectIncomeBehavior } from '@/domains/project/types/categories';
import { type PlannedIncome, PlannedIncomeCategory } from '@/domains/record/types';

export function calculateIncomeStatement(
  plannedIncomes: PlannedIncome[],
  projectWithSnapshots: ProjectWithSnapshot[],
): IncomeStatementData {
  // 1. Calculate Revenue
  const revenueItems: IncomeStatementItem[] = [];

  // Planned Income - Split by category
  // Salary
  const salaryIncomes = plannedIncomes.filter((pi) => pi.category === PlannedIncomeCategory.SALARY);
  const salaryTotal = salaryIncomes.reduce((sum, pi) => sum + pi.amount, 0);
  if (salaryTotal > 0) {
    revenueItems.push({
      category: IncomeSubCategory.SALARY,
      amount: salaryTotal,
      subItems: salaryIncomes.map((pi) => ({
        name: pi.description || pi.category,
        amount: pi.amount,
      })),
    });
  }

  // Bonus
  const bonusIncomes = plannedIncomes.filter((pi) => pi.category === PlannedIncomeCategory.BONUS);
  const bonusTotal = bonusIncomes.reduce((sum, pi) => sum + pi.amount, 0);
  if (bonusTotal > 0) {
    revenueItems.push({
      category: IncomeSubCategory.BONUS,
      amount: bonusTotal,
      subItems: bonusIncomes.map((pi) => ({
        name: pi.description || pi.category,
        amount: pi.amount,
      })),
    });
  }

  // Other Planned Incomes
  const otherIncomes = plannedIncomes.filter(
    (pi) =>
      pi.category !== PlannedIncomeCategory.SALARY && pi.category !== PlannedIncomeCategory.BONUS,
  );
  const otherTotal = otherIncomes.reduce((sum, pi) => sum + pi.amount, 0);
  if (otherTotal > 0) {
    revenueItems.push({
      category: IncomeSubCategory.OTHER_INCOME,
      amount: otherTotal,
      subItems: otherIncomes.map((pi) => ({ name: pi.category, amount: pi.amount })),
    });
  }

  // Project Incomes
  const projectIncomeMap = new Map<
    string,
    { amount: number; subItems: { name: string; amount: number }[] }
  >();
  projectWithSnapshots.forEach((pws) => {
    if (!pws || !pws.snapshot) return;

    if (pws?.accounting?.incomeStatement?.category === IncomeStatementCategory.INCOME) {
      const subcategory =
        pws.accounting.incomeStatement.subcategory || IncomeSubCategory.OTHER_INCOME;
      const behavior = pws.accounting.flowBehavior;
      const snapshot = pws.snapshot;

      let amount = 0;
      if (!behavior) {
        amount = snapshot.income;
      } else {
        if (behavior.incomeAs === ProjectIncomeBehavior.INCREASE_INCOME) amount += snapshot.income;
        if (behavior.incomeAs === ProjectIncomeBehavior.DECREASE_INCOME) amount -= snapshot.income;
      }

      if (amount !== 0) {
        const current = projectIncomeMap.get(subcategory) || { amount: 0, subItems: [] };
        current.amount += amount;
        current.subItems.push({ name: pws.name, amount });
        projectIncomeMap.set(subcategory, current);
      }
    }
  });
  projectIncomeMap.forEach((data, category) => {
    revenueItems.push({
      category,
      amount: data.amount,
      subItems: data.subItems,
    });
  });

  const totalRevenue = revenueItems.reduce((sum, item) => sum + item.amount, 0);

  // 2. Calculate Project Accounting Expenses
  const expenseItems: IncomeStatementItem[] = [];

  // Project Expenses
  const projectExpenseMap = new Map<
    string,
    { amount: number; subItems: { name: string; amount: number }[] }
  >();
  projectWithSnapshots.forEach((pws) => {
    if (!pws || !pws.snapshot) return;

    if (pws?.accounting?.incomeStatement?.category === IncomeStatementCategory.EXPENSE) {
      const subcategory =
        pws.accounting.incomeStatement.subcategory || ExpenseSubCategory.OTHER_EXPENSE;
      const behavior = pws.accounting.flowBehavior;
      const snapshot = pws.snapshot;

      let amount = 0;
      if (!behavior) {
        amount = snapshot.expense;
      } else {
        if (behavior.expenseAs === ProjectExpenseBehavior.INCREASE_EXPENSE)
          amount += snapshot.expense;
        if (behavior.expenseAs === ProjectExpenseBehavior.DECREASE_EXPENSE)
          amount -= snapshot.expense;
      }

      if (amount !== 0) {
        const current = projectExpenseMap.get(subcategory) || { amount: 0, subItems: [] };
        current.amount += amount;
        current.subItems.push({ name: pws.name, amount });
        projectExpenseMap.set(subcategory, current);
      }
    }
  });
  projectExpenseMap.forEach((data, category) => {
    expenseItems.push({
      category,
      amount: data.amount,
      subItems: data.subItems,
    });
  });

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
