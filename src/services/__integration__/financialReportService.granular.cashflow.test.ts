import { Timestamp } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountCategory, CurrencyType } from '../../domains/account/types/categories';
import {
  CashFlowCategory,
  FinancingSubCategory,
  InvestingSubCategory,
  OperatingSubCategory,
} from '../../domains/finance/types/categories';
import { ProjectCategory } from '../../domains/project/types/categories';
import { CashFlowData } from '../../schemas/cashFlow';
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

  it('should calculate Cash Flow correctly from Project Activities', async () => {
    // 1. Operating Activity (Expense)
    const projOpId = 'proj_op';
    mockDb[`households/${householdId}/projects/${projOpId}`] = {
      id: projOpId,
      name: 'Operating Project',
      category: ProjectCategory.OPERATING,
      accounting: {
        enabled: true,
        cashFlow: {
          category: CashFlowCategory.OPERATING,
          subcategory: OperatingSubCategory.REGULAR_OPERATIONS,
        },
      },
      createdAt: Timestamp.now(),
    };
    mockDb[`households/${householdId}/projects/${projOpId}/snapshots/2025-01`] = {
      id: '2025-01',
      year: 2025,
      month: 1,
      income: 0,
      expense: 2000,
      closingBalance: 0,
      openingBalance: 0,
      createdAt: Timestamp.now(),
    };

    // 2. Investing Activity (Stock)
    const projInvId = 'proj_inv';
    mockDb[`households/${householdId}/projects/${projInvId}`] = {
      id: projInvId,
      name: 'Investing Project',
      category: ProjectCategory.INVESTING,
      accounting: {
        enabled: true,
        cashFlow: {
          category: CashFlowCategory.INVESTING,
          subcategory: InvestingSubCategory.STOCK_INVESTMENTS,
        },
      },
      createdAt: Timestamp.now(),
    };
    mockDb[`households/${householdId}/projects/${projInvId}/snapshots/2025-01`] = {
      id: '2025-01',
      year: 2025,
      month: 1,
      income: 0,
      expense: 5000,
      closingBalance: 0,
      openingBalance: 0,
      createdAt: Timestamp.now(),
    };

    // 3. Investing Activity (Purchase Assets)
    const projInvId2 = 'proj_inv2';
    mockDb[`households/${householdId}/projects/${projInvId2}`] = {
      id: projInvId2,
      name: 'Investing Project 2',
      category: ProjectCategory.INVESTING,
      accounting: {
        enabled: true,
        cashFlow: {
          category: CashFlowCategory.INVESTING,
          subcategory: InvestingSubCategory.PURCHASE_ASSETS,
        },
      },
      createdAt: Timestamp.now(),
    };
    mockDb[`households/${householdId}/projects/${projInvId2}/snapshots/2025-01`] = {
      id: '2025-01',
      year: 2025,
      month: 1,
      income: 0,
      expense: 300000,
      closingBalance: 0,
      openingBalance: 0,
      createdAt: Timestamp.now(),
    };

    // 4. Financing Activity (Income/Borrow)
    const projFinId = 'proj_fin';
    mockDb[`households/${householdId}/projects/${projFinId}`] = {
      id: projFinId,
      name: 'Financing Project',
      category: 'liabilities',
      accounting: {
        enabled: true,
        cashFlow: {
          category: CashFlowCategory.FINANCING,
          subcategory: FinancingSubCategory.SHORT_TERM_LOANS,
        },
      },
      createdAt: Timestamp.now(),
    };
    mockDb[`households/${householdId}/projects/${projFinId}/snapshots/2025-01`] = {
      id: '2025-01',
      year: 2025,
      month: 1,
      income: 10000,
      expense: 500,
      closingBalance: 0,
      openingBalance: 0,
      createdAt: Timestamp.now(),
    };

    // 5. Financing Activity (Owner Draw)
    // Owner Draw amount will be negative in income and positive in expense
    const projFinId2 = 'proj_fin2';
    mockDb[`households/${householdId}/projects/${projFinId2}`] = {
      id: projFinId2,
      name: 'Financing Project 2',
      category: 'liabilities',
      accounting: {
        enabled: true,
        cashFlow: {
          category: CashFlowCategory.FINANCING,
          subcategory: FinancingSubCategory.OWNER_DRAWS,
        },
      },
      createdAt: Timestamp.now(),
    };
    mockDb[`households/${householdId}/projects/${projFinId2}/snapshots/2025-01`] = {
      id: '2025-01',
      year: 2025,
      month: 1,
      income: 10000,
      expense: 0,
      closingBalance: 0,
      openingBalance: 0,
      createdAt: Timestamp.now(),
    };

    // 6. Accounts (for Beginning Cash)
    const accountId = 'acc_cash';
    mockDb[`households/${householdId}/accounts/${accountId}`] = {
      id: accountId,
      name: 'Cash Account',
      type: 'cash',
      category: AccountCategory.CASH,
      currency: CurrencyType.TWD,
      createdAt: Timestamp.now(),
    };
    // Previous Month Snapshot (Dec 2024): 100,000
    mockDb[`households/${householdId}/accounts/${accountId}/snapshots/${accountId}_2024-12`] = {
      id: `${accountId}_2024-12`,
      year: 2024,
      month: 12,
      amount: 100000,
      createdAt: Timestamp.now(),
    };

    // Current Month Snapshot (Jan 2025): -207,500 (To align with expected ending balance and prevent automatic reconciliation)
    mockDb[`households/${householdId}/accounts/${accountId}/snapshots/${accountId}_2025-01`] = {
      id: `${accountId}_2025-01`,
      year: 2025,
      month: 1,
      amount: -207500,
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
    // Operating: -2000
    // Investing: -5000, -300000
    // Financing: +10000, -500, -10000
    // Net Change: -2000 + (-5000) + (-300000) + 10000 + (-500) + (-10000) = -307500
    // Beginning Cash: 100,000
    // Ending Cash: 100,000 - 307,500 = -207,500

    const data = reports.cashFlow.data as CashFlowData;

    expect(data.netChange).toBe(-307500);
    expect(data.beginningBalance).toBe(100000);
    expect(data.endingBalance).toBe(-207500);

    // Check Categories

    // operating
    // if reconciliation is needed, it will be added to other_operating
    const totalOperatingIncome = data.operating.income.reduce((acc, item) => acc + item.amount, 0);
    const totalOperatingExpense = data.operating.expense.reduce(
      (acc, item) => acc + item.amount,
      0,
    );
    expect(totalOperatingIncome).toBe(0);
    expect(totalOperatingExpense).toBe(2000);
    expect(data.operating.netAmount).toBe(-2000);

    // investing
    const totalInvestingIncome = data.investing.income.reduce((acc, item) => acc + item.amount, 0);
    const totalInvestingExpense = data.investing.expense.reduce(
      (acc, item) => acc + item.amount,
      0,
    );
    expect(totalInvestingIncome).toBe(0);
    expect(totalInvestingExpense).toBe(305000);
    expect(data.investing.netAmount).toBe(-305000);

    // financing
    const totalFinancingIncome = data.financing.income.reduce((acc, item) => acc + item.amount, 0);
    const totalFinancingExpense = data.financing.expense.reduce(
      (acc, item) => acc + item.amount,
      0,
    );
    expect(totalFinancingIncome).toBe(10000);
    expect(totalFinancingExpense).toBe(10500);
    expect(data.financing.netAmount).toBe(-500);
  });
});
