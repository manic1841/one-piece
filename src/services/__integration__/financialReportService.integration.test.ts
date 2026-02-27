import { Timestamp } from 'firebase/firestore';
import { beforeEach, describe, expect, it } from 'vitest';

import { AccountCategory, CurrencyType } from '../../domains/account/types/categories';
import {
  AssetSubCategory,
  BalanceSheetCategory,
  CashFlowCategory,
  EquitySubCategory,
  ExpenseSubCategory,
  FinancingSubCategory,
  IncomeStatementCategory,
  InvestingSubCategory,
  LiabilitySubCategory,
  OperatingSubCategory,
} from '../../domains/finance/types/categories';
import { PlannedIncomeCategory } from '../../domains/record/types/categories';
import { mockDb, resetMockDb } from '../../test/mocks/firebase';
import { financialReportService } from '../financialReportService';

describe('Financial Report Service Integration - Full Scenario', () => {
  const householdId = 'household_wang_001';
  const userId = 'user_wang_001';
  const year = 2025;
  const month = 1;

  beforeEach(() => {
    resetMockDb();
  });

  it('should generate accurate financial reports from realistic family data', async () => {
    // -------------------------------------------------------------------------
    // 1. Setup Household & Members
    // -------------------------------------------------------------------------
    mockDb[`households/${householdId}`] = {
      id: householdId,
      name: '王家',
      createdAt: Timestamp.now(),
      members: [{ uid: userId, name: '王大明', role: 'owner' }],
    };

    // -------------------------------------------------------------------------
    // 2. Setup Projects (Operating, Investing, Financing)
    // -------------------------------------------------------------------------
    const createProject = (
      id: string,
      name: string,
      type: 'operating' | 'investing' | 'financing' | 'other',
      accountingConf: any,
    ) => {
      mockDb[`households/${householdId}/projects/${id}`] = {
        id,
        name,
        category: type,
        accounting: {
          enabled: true,
          ...accountingConf,
        },
        isActive: true,
        createdAt: Timestamp.now(),
        createdBy: userId,
      };
    };

    // --- Operating Projects (Expenses) ---
    createProject('proj_living', '生活開銷', 'operating', {
      incomeStatement: {
        category: IncomeStatementCategory.EXPENSE,
        subcategory: ExpenseSubCategory.LIVING,
      },
      cashFlow: {
        category: CashFlowCategory.OPERATING,
        subcategory: OperatingSubCategory.REGULAR_OPERATIONS,
      },
    });

    createProject('proj_housing', '居住支出', 'operating', {
      incomeStatement: {
        category: IncomeStatementCategory.EXPENSE,
        subcategory: ExpenseSubCategory.HOUSING,
      },
      cashFlow: {
        category: CashFlowCategory.OPERATING,
        subcategory: OperatingSubCategory.REGULAR_OPERATIONS,
      },
    });

    createProject('proj_transport', '交通支出', 'operating', {
      incomeStatement: {
        category: IncomeStatementCategory.EXPENSE,
        subcategory: ExpenseSubCategory.TRANSPORTATION,
      },
      cashFlow: {
        category: CashFlowCategory.OPERATING,
        subcategory: OperatingSubCategory.REGULAR_OPERATIONS,
      },
    });

    // --- Financing Projects (Liabilities & Payments) ---
    // 1. Mortgage Loan (Liability Principal)
    createProject('proj_mortgage', '房貸本金', 'financing', {
      // Balance Sheet Liability
      balanceSheet: {
        category: BalanceSheetCategory.LIABILITY,
        subcategory: LiabilitySubCategory.LONG_TERM_DEBT,
      },
      // Cash Flow: Repayment
      cashFlow: {
        category: CashFlowCategory.FINANCING,
        subcategory: FinancingSubCategory.LONG_TERM_LOANS,
      },
      // Note: Repaying principal is NOT an Income Statement Expense.
    });

    // 2. Mortgage Interest (Expense)
    createProject('proj_mortgage_interest', '房貸利息', 'operating', {
      incomeStatement: {
        category: IncomeStatementCategory.EXPENSE,
        subcategory: ExpenseSubCategory.HOUSING, // or Interest
      },
      cashFlow: {
        category: CashFlowCategory.OPERATING,
        subcategory: OperatingSubCategory.REGULAR_OPERATIONS,
      },
    });

    // --- Investing Projects (Assets & Activities) ---
    // 1. Stock Investment (Asset)
    createProject('proj_stock', '股票投資', 'investing', {
      balanceSheet: {
        category: BalanceSheetCategory.ASSET,
        subcategory: AssetSubCategory.INVESTMENTS,
      },
      cashFlow: {
        category: CashFlowCategory.INVESTING,
        subcategory: InvestingSubCategory.STOCK_INVESTMENTS,
      },
    });

    // --- Equity Projects ---
    createProject('proj_equity', '家計淨值', 'other', {
      balanceSheet: {
        category: BalanceSheetCategory.EQUITY,
        subcategory: EquitySubCategory.RETAINED_EARNINGS,
      },
    });

    // -------------------------------------------------------------------------
    // 3. Setup Project Snapshots (Actual Financial Activity for January)
    // -------------------------------------------------------------------------
    // Helper to seed snapshot
    const seedSnapshot = (projId: string, income: number, expense: number, closing: number) => {
      // Derive opening for consistency (assuming pure flow)
      // Closing = Opening + Income - Expense
      // Opening = Closing - Income + Expense
      const opening = closing - income + expense;

      mockDb[`households/${householdId}/projects/${projId}/snapshots/2025-01`] = {
        id: '2025-01',
        year: 2025,
        month: 1,
        openingBalance: opening,
        income,
        expense,
        closingBalance: closing,
        createdAt: Timestamp.now(),
      };
    };

    // -- Operating Activity --
    // Living: Expense 32,000. Balance resets or accumulates?
    // Usually Expense Projects accumulate negative balance or reset.
    // Let's assume they are "Flow" projects (Balance 0 -> -32000).
    seedSnapshot('proj_living', 0, 32000, -32000);
    seedSnapshot('proj_housing', 0, 5000, -5000); // Admin fees etc
    seedSnapshot('proj_transport', 0, 7000, -7000);

    // -- Financing Activity --
    // Mortgage Principal:
    // Opening Debt: 3,000,000 (represented as -3,000,000 liability).
    // Repayment: 20,000.

    seedSnapshot('proj_mortgage', 0, 20000, -2980000); // 20k Principal Repayment
    seedSnapshot('proj_mortgage_interest', 0, 5000, -5000); // 5k Interest

    // -- Investing Activity --
    // Stock: Buy 10,000.
    // Expense: 10,000. (C/F Outflow).
    // Asset Value: Increases by 10,000.
    // Opening: 50,000. Closing: 60,000.
    seedSnapshot('proj_stock', 0, 10000, 60000);

    // -- Equity Activity --
    // Opening Equity: 250k - 3M = -2,750,000.
    // Closing Equity: 301k - 2.98M = -2,679,000.
    seedSnapshot('proj_equity', 0, 0, -2679000);

    // -------------------------------------------------------------------------
    // 4. Setup Planned Income (Revenue)
    // -------------------------------------------------------------------------
    const createPlannedIncome = (id: string, amount: number, cat: PlannedIncomeCategory) => {
      mockDb[`households/${householdId}/plannedIncomes/${id}`] = {
        id,
        amount,
        category: cat,
        date: Timestamp.fromDate(new Date('2025-01-05')),
        allocations: [],
        createdAt: Timestamp.now(),
        createdBy: userId,
      };
    };
    createPlannedIncome('pi_salary', 100000, PlannedIncomeCategory.SALARY);
    createPlannedIncome('pi_bonus', 20000, PlannedIncomeCategory.BONUS);

    // -------------------------------------------------------------------------
    // 5. Setup Transactions (Ad-hoc Income/Expense)
    // -------------------------------------------------------------------------
    // User specified transactions are NOT income, so we skip ad-hoc income here.
    // If we had expenses, they would be here.

    // -------------------------------------------------------------------------
    // 6. Setup Accounts (For Cash Balance)
    // -------------------------------------------------------------------------
    mockDb[`households/${householdId}/accounts/acc_bank`] = {
      id: 'acc_bank',
      name: 'Bank',
      category: AccountCategory.BANK,
      currency: CurrencyType.TWD,
      createdAt: Timestamp.now(),
    };
    // Dec 2024 (Opening for Jan)
    mockDb[`households/${householdId}/accounts/acc_bank/snapshots/acc_bank_2024-12`] = {
      id: 'acc_bank_2024-12',
      year: 2024,
      month: 12,
      amount: 200000, // Opening Cash
      createdAt: Timestamp.now(),
    };
    // Jan 2025 (Closing)
    // Theoretically:
    // In: 100k + 20k + 5k = 125,000
    // Out: 32k(Living) + 5k(House) + 7k(Trans) + 5k(Interest) + 20k(Principal) + 10k(Stock) = 79,000
    // Net: +41,000
    // Expected Closing: 241,000
    mockDb[`households/${householdId}/accounts/acc_bank/snapshots/acc_bank_2025-01`] = {
      id: 'acc_bank_2025-01',
      year: 2025,
      month: 1,
      amount: 241000,
      createdAt: Timestamp.now(),
    };

    // -------------------------------------------------------------------------
    // 7. Execute
    // -------------------------------------------------------------------------
    const reports = await financialReportService.generateFinancialReports(
      householdId,
      year,
      month,
      userId,
    );

    const { incomeStatement, balanceSheet, cashFlow } = reports;

    // -------------------------------------------------------------------------
    // 8. Verify Income Statement
    // -------------------------------------------------------------------------
    // Revenue: Salary(100k) + Bonus(20k) = 120,000
    // Expenses: Living(32k) + Housing(5k) + Transport(7k) + Interest(5k) = 49,000.
    // (Principal 20k and Stock 10k are NOT Income Statement Expenses).
    // Net Income: 120,000 - 49,000 = 71,000.

    // Check Total Revenue
    const revenue = incomeStatement.data.revenue.total;
    expect(revenue).toBe(120000);
    // Check Total Expense
    const expenses = incomeStatement.data.expenses.total;
    expect(expenses).toBe(49000);
    const netIncome = incomeStatement.data.netIncome;
    expect(netIncome).toBe(71000);

    // -------------------------------------------------------------------------
    // 9. Verify Cash Flow
    // -------------------------------------------------------------------------
    // Operating Net:
    // In: 0? (Unless Income allocated to Op projects? No)
    // Out: 32k + 5k + 7k + 5k = 49,000.
    // Net: -49,000.

    // Investing Net:
    // Out: 10,000 (Stock).
    // Net: -10,000.

    // Financing Net:
    // Out: 20,000 (Mortgage Principal).
    // Net: -20,000.

    // Total Net Change: -49k - 10k - 20k = -79,000?
    // Let's assume standard logic: Income is Cash In.
    // So Operating In: 125,000.
    // Operating Out: 49,000.
    // Operating Net: +76,000.
    // Net Change: 76k - 10k(Inv) - 20k(Fin) = 46,000.

    const cf = cashFlow.data;
    expect(cf.netChange).toBe(41000);
    expect(cf.beginningBalance).toBe(200000);
    expect(cf.endingBalance).toBe(241000);

    // -------------------------------------------------------------------------
    // 10. Verify Balance Sheet
    // -------------------------------------------------------------------------
    // Assets:
    // Cash: 241,000.
    // Investments: 60,000.
    // Total Assets: 301,000.

    // Liabilities:
    // Mortgage: 2,980,000.
    // Total Liab: 2,980,000.

    // Equity:
    // Assets - Liabilities = 301k - 2.98M = -2,679,000.
    // Also, theoretically:
    // Opening Equity? (Not tracked explicitly here).
    // Delta Equity should equal Net Income?
    // Net Income = 71,000.
    // Change in Net Assets = (301k - 2.98M) - (Opening Assets - Opening Liab)
    // Opening Assets: 200k(Cash) + 50k(Inv) = 250,000.
    // Opening Liab: 3,000,000.
    // Opening Equity: 250k - 3M = -2,750,000.
    // Change: -2,679,000 - (-2,750,000) = +71,000.
    // Matches Net Income! (Accounting equation holds).

    const bs = balanceSheet.data;
    expect(bs.assets.total).toBe(301000);
    expect(bs.liabilities.total).toBe(2980000);
    expect(bs.equity.total).toBe(-2679000);
  });
});
