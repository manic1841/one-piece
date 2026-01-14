import {
  ExpenseSubCategory,
  IncomeStatementCategory,
  IncomeSubCategory,
} from '@/domains/finance/types/categories';
import type { ProjectWithSnapshot } from '@/domains/project/types';
import { PlannedIncomeCategory } from '@/domains/record/types/categories';
import type { PlannedIncome } from '@/schemas/plannedIncome';
import { createPlannedIncome } from '@/test/factory/factories';
import { createProjectWithSnapshot } from '@/test/factory/factories';

// Test case: Salary income only
export const salaryData = {
  plannedIncomes: [
    createPlannedIncome({
      id: 'income1',
      category: PlannedIncomeCategory.SALARY,
      amount: 50000,
    }),
  ],
  projects: [] as ProjectWithSnapshot[],
};

// Test case: Bonus income
export const bonusData = {
  plannedIncomes: [
    createPlannedIncome({
      id: 'income1',
      category: PlannedIncomeCategory.BONUS,
      amount: 10000,
    }),
  ],
  projects: [] as ProjectWithSnapshot[],
};

// Test case: Project income
export const projectIncomeData = {
  plannedIncomes: [] as PlannedIncome[],
  projects: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Consulting Project',
        accounting: {
          enabled: true,
          incomeStatement: {
            category: IncomeStatementCategory.INCOME,
            subcategory: IncomeSubCategory.OTHER_INCOME,
          },
        },
      },
      {
        closingBalance: 15000,
        income: 15000,
        expense: 0,
      },
    ),
  ],
};

// Test case: Project expense
export const projectExpenseData = {
  plannedIncomes: [] as PlannedIncome[],
  projects: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Office Expenses',
        accounting: {
          enabled: true,
          incomeStatement: {
            category: IncomeStatementCategory.EXPENSE,
            subcategory: ExpenseSubCategory.HOUSING,
          },
        },
      },
      {
        closingBalance: 5000,
        income: 0,
        expense: 5000,
      },
    ),
  ],
};

// Test case: Multiple income sources
export const multipleIncomeData = {
  plannedIncomes: [
    createPlannedIncome({
      id: 'income1',
      category: PlannedIncomeCategory.SALARY,
      amount: 50000,
    }),
    createPlannedIncome({
      id: 'income2',
      category: PlannedIncomeCategory.BONUS,
      amount: 10000,
    }),
  ],
  projects: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Side Business',
        accounting: {
          enabled: true,
          incomeStatement: {
            category: IncomeStatementCategory.INCOME,
            subcategory: IncomeSubCategory.OTHER_INCOME,
          },
        },
      },
      {
        closingBalance: 8000,
        income: 8000,
        expense: 0,
      },
    ),
  ],
};

// Test case: Income and expense together
export const incomeAndExpenseData = {
  plannedIncomes: [
    createPlannedIncome({
      id: 'income1',
      category: PlannedIncomeCategory.SALARY,
      amount: 60000,
    }),
  ],
  projects: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Business Revenue',
        accounting: {
          enabled: true,
          incomeStatement: {
            category: IncomeStatementCategory.INCOME,
            subcategory: IncomeSubCategory.OTHER_INCOME,
          },
        },
      },
      {
        closingBalance: 10000,
        income: 10000,
        expense: 0,
      },
    ),
    createProjectWithSnapshot(
      {
        id: 'project2',
        name: 'Living Expenses',
        accounting: {
          enabled: true,
          incomeStatement: {
            category: IncomeStatementCategory.EXPENSE,
            subcategory: ExpenseSubCategory.LIVING,
          },
        },
      },
      {
        closingBalance: 20000,
        income: 0,
        expense: 20000,
      },
    ),
  ],
};

// Test case: Aggregation of same subcategory
export const aggregationData = {
  plannedIncomes: [] as PlannedIncome[],
  projects: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Project A',
        accounting: {
          enabled: true,
          incomeStatement: {
            category: IncomeStatementCategory.INCOME,
            subcategory: IncomeSubCategory.OTHER_INCOME,
          },
        },
      },
      {
        closingBalance: 5000,
        income: 5000,
        expense: 0,
      },
    ),
    createProjectWithSnapshot(
      {
        id: 'project2',
        name: 'Project B',
        accounting: {
          enabled: true,
          incomeStatement: {
            category: IncomeStatementCategory.INCOME,
            subcategory: IncomeSubCategory.OTHER_INCOME,
          },
        },
      },
      {
        closingBalance: 3000,
        income: 3000,
        expense: 0,
      },
    ),
  ],
};

// Test case: Empty data
export const emptyData = {
  plannedIncomes: [] as PlannedIncome[],
  projects: [] as ProjectWithSnapshot[],
};

// Test case: Projects without accounting
export const noAccountingData = {
  plannedIncomes: [
    createPlannedIncome({
      id: 'income1',
      category: PlannedIncomeCategory.SALARY,
      amount: 40000,
    }),
  ],
  projects: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'No Accounting',
        accounting: undefined,
      },
      {
        closingBalance: 5000,
        income: 5000,
        expense: 0,
      },
    ),
  ],
};
