import { Timestamp } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ExpenseSubCategory,
  IncomeStatementCategory,
  IncomeSubCategory,
} from '../../domains/finance/types/categories';
import { PlannedIncomeCategory } from '../../domains/record/types/categories';
import { type IncomeStatementData } from '../../schemas/incomeStatement';
import { financialReportService } from '../../services/financialReportService';
import { mockDb } from '../../test/mocks/firebase';

vi.mock('@/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'user_123' } },
}));

describe('Financial Report Service - Granular Tests', () => {
  const userId = 'user_123';
  const householdId = 'household_gran_001';
  const year = 2025;
  const month = 1;

  beforeEach(() => {
    // Clear mock DB
    for (const key in mockDb) delete mockDb[key];

    // Setup User & Household
    mockDb[`users/${userId}`] = {
      uid: userId,
      email: 'test@example.com',
      currentHouseholdId: householdId,
    };
    mockDb[`households/${householdId}`] = {
      id: householdId,
      name: 'Granular Test Household',
      members: [{ uid: userId, name: 'Tester', role: 'admin' }],
    };
  });

  it('should calculate Revenue correctly from Planned Income', async () => {
    // 1. Planned Income: Salary 50,000
    mockDb[`households/${householdId}/plannedIncomes/inc_salary`] = {
      id: 'inc_salary',
      name: 'Salary',
      amount: 50000,
      category: PlannedIncomeCategory.SALARY,
      date: Timestamp.fromDate(new Date('2025-01-01')),
      allocations: [],
      createdAt: Timestamp.now(),
    };

    // 2. Planned Income: Bonus 10,000
    // Date: 2025-01-15
    mockDb[`households/${householdId}/plannedIncomes/pl_bonus`] = {
      id: 'pl_bonus',
      name: 'Bonus',
      amount: 10000,
      category: PlannedIncomeCategory.BONUS,
      date: Timestamp.fromDate(new Date('2025-01-15')),
      createdAt: Timestamp.now(),
    };

    // 3. Planned Income: Other 5,000
    mockDb[`households/${householdId}/plannedIncomes/pl_other`] = {
      id: 'pl_other',
      name: 'Other',
      amount: 5000,
      category: PlannedIncomeCategory.OTHER,
      date: Timestamp.fromDate(new Date('2025-01-20')),
      createdAt: Timestamp.now(),
    };

    // Act
    const reports = await financialReportService.generateFinancialReports(
      householdId,
      year,
      month,
      userId,
    );

    // Assert
    // Total Revenue = 50,000 (Salary) + 10,000 (Bonus) + 5,000 (Other) = 65,000
    expect(reports.incomeStatement.data.revenue.total).toBe(65000);

    // Check Subitems
    const data = reports.incomeStatement.data as IncomeStatementData;
    const salaryItem = data.revenue.items.find((i) => i.category === IncomeSubCategory.SALARY);
    expect(salaryItem).toBeDefined();
    expect(salaryItem?.amount).toBe(50000);

    const bonusItem = data.revenue.items.find((i) => i.category === IncomeSubCategory.BONUS);
    expect(bonusItem).toBeDefined();
    expect(bonusItem?.amount).toBe(10000);

    const otherItem = data.revenue.items.find((i) => i.category === IncomeSubCategory.OTHER_INCOME);
    expect(otherItem).toBeDefined();
    expect(otherItem?.amount).toBe(5000);
  });

  it('should calculate Expenses correctly from Project Snapshots', async () => {
    // 1. Expense Project
    const projectId = 'proj_living';
    mockDb[`households/${householdId}/projects/${projectId}`] = {
      id: projectId,
      name: 'Living Expenses',
      category: 'operating',
      accounting: {
        enabled: true,
        incomeStatement: {
          category: IncomeStatementCategory.EXPENSE,
          subcategory: ExpenseSubCategory.LIVING,
        },
      },
      createdAt: Timestamp.now(),
    };

    // 2. Snapshot
    // Expense: 20,000. Closing: 20,000.
    mockDb[`households/${householdId}/projects/${projectId}/snapshots/2025-01`] = {
      id: '2025-01',
      year: 2025,
      month: 1,
      income: 0,
      expense: 20000,
      closingBalance: 20000, // For Expense projects, closing balance usually tracks the expense amount?
      // check incomeStatementCalculator logic: it uses closingBalance for expense projects.
      openingBalance: 0,
      createdAt: Timestamp.now(),
    };

    // Act
    const reports = await financialReportService.generateFinancialReports(
      householdId,
      year,
      month,
      userId,
    );

    // Assert
    expect(reports.incomeStatement.data.expenses.total).toBe(20000);

    const data = reports.incomeStatement.data as IncomeStatementData;
    const item = data.expenses.items.find((i) => i.category === ExpenseSubCategory.LIVING);
    expect(item).toBeDefined();
    expect(item?.amount).toBe(20000);
  });

  it('should calculate Expenses correctly from multiple Project Snapshots', async () => {
    // 1. Living Expense Project
    const projectId = 'proj_living';
    mockDb[`households/${householdId}/projects/${projectId}`] = {
      id: projectId,
      name: 'Living Expenses',
      category: 'operating',
      accounting: {
        enabled: true,
        incomeStatement: {
          category: IncomeStatementCategory.EXPENSE,
          subcategory: ExpenseSubCategory.LIVING,
        },
      },
      createdAt: Timestamp.now(),
    };

    // Expense: 20,000. Closing: -20,000.
    mockDb[`households/${householdId}/projects/${projectId}/snapshots/2025-01`] = {
      id: '2025-01',
      year: 2025,
      month: 1,
      income: 0,
      expense: 20000,
      closingBalance: -20000, // For Expense projects, closing balance usually tracks the expense amount?
      // check incomeStatementCalculator logic: it uses closingBalance for expense projects.
      openingBalance: 0,
      createdAt: Timestamp.now(),
    };

    // 2. House Expense Project
    const projectId2 = 'proj_house';
    mockDb[`households/${householdId}/projects/${projectId2}`] = {
      id: projectId2,
      name: 'House Expenses',
      category: 'operating',
      accounting: {
        enabled: true,
        incomeStatement: {
          category: IncomeStatementCategory.EXPENSE,
          subcategory: ExpenseSubCategory.HOUSING,
        },
      },
      createdAt: Timestamp.now(),
    };

    // Expense: 50,000. Closing: -50,000.
    mockDb[`households/${householdId}/projects/${projectId2}/snapshots/2025-01`] = {
      id: '2025-01',
      year: 2025,
      month: 1,
      income: 0,
      expense: 50000,
      closingBalance: -50000, // For Expense projects, closing balance usually tracks the expense amount?
      // check incomeStatementCalculator logic: it uses closingBalance for expense projects.
      openingBalance: 0,
      createdAt: Timestamp.now(),
    };

    // Act
    const reports = await financialReportService.generateFinancialReports(
      householdId,
      year,
      month,
      userId,
    );

    // Assert
    // Expenses = 20,000 (Living) + 50,000 (House) = 70,000
    expect(reports.incomeStatement.data.expenses.total).toBe(-70000);

    const data = reports.incomeStatement.data as IncomeStatementData;
    const item = data.expenses.items.find((i) => i.category === ExpenseSubCategory.LIVING);
    expect(item).toBeDefined();
    expect(item?.amount).toBe(-20000);

    const item2 = data.expenses.items.find((i) => i.category === ExpenseSubCategory.HOUSING);
    expect(item2).toBeDefined();
    expect(item2?.amount).toBe(-50000);
  });
});
