import { Timestamp } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountCategory, CurrencyType } from '../../domains/account/types/categories';
import {
  AssetSubCategory,
  BalanceSheetCategory,
  EquitySubCategory,
  LiabilitySubCategory,
} from '../../domains/finance/types/categories';
import { ProjectCategory } from '../../domains/project/types/categories';
import { type BalanceSheetData } from '../../schemas/balanceSheet';
import { financialReportService } from '../../services/financialReportService';
import { mockDb } from '../../test/mocks/firebase';

vi.mock('../../firebase', () => ({
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

  it('should calculate Assets correctly from Accounts and Projects', async () => {
    // 1. Bank Account (Cash Asset)
    const accountId = 'acc_bank';
    mockDb[`households/${householdId}/accounts/${accountId}`] = {
      id: accountId,
      name: 'Bank Account',
      type: 'bank',
      category: AccountCategory.BANK,
      currency: CurrencyType.TWD,
      createdAt: Timestamp.now(),
    };
    // Account Snapshot (100,000)
    mockDb[`households/${householdId}/accounts/${accountId}/snapshots/${accountId}_2025-01`] = {
      id: `${accountId}_2025-01`,
      year: 2025,
      month: 1,
      amount: 100000,
      createdAt: Timestamp.now(),
    };

    // 2. Investment Account (Asset)
    const investmentAccountId = 'acc_invest';
    mockDb[`households/${householdId}/accounts/${investmentAccountId}`] = {
      id: investmentAccountId,
      name: 'Stock Investment',
      category: AccountCategory.INVESTMENT,
      currency: CurrencyType.TWD,
      createdAt: Timestamp.now(),
    };
    // Investment Account Snapshot (50,000)
    mockDb[
      `households/${householdId}/accounts/${investmentAccountId}/snapshots/${investmentAccountId}_2025-01`
    ] = {
      id: `${investmentAccountId}_2025-01`,
      year: 2025,
      month: 1,
      amount: 50000,
      openingBalance: 0,
      createdAt: Timestamp.now(),
    };
    // 3. Other Account
    const otherAccountId = 'acc_other';
    mockDb[`households/${householdId}/accounts/${otherAccountId}`] = {
      id: otherAccountId,
      name: 'Other Account',
      category: AccountCategory.OTHER,
      currency: CurrencyType.TWD,
      createdAt: Timestamp.now(),
    };
    // Other Account Snapshot (10,000)
    mockDb[
      `households/${householdId}/accounts/${otherAccountId}/snapshots/${otherAccountId}_2025-01`
    ] = {
      id: `${otherAccountId}_2025-01`,
      year: 2025,
      month: 1,
      amount: 10000,
      openingBalance: 0,
      createdAt: Timestamp.now(),
    };

    // 4. RealEstate Project
    const projectId2 = 'proj_realEstate';
    mockDb[`households/${householdId}/projects/${projectId2}`] = {
      id: projectId2,
      name: 'Real Estate',
      category: ProjectCategory.ASSET,
      accounting: {
        enabled: true,
        balanceSheet: {
          category: BalanceSheetCategory.ASSET,
          subcategory: AssetSubCategory.REAL_ESTATE,
        },
      },
      createdAt: Timestamp.now(),
    };

    // RealEstate Project Snapshot (500,000)
    mockDb[`households/${householdId}/projects/${projectId2}/snapshots/${projectId2}_2025-01`] = {
      id: `${projectId2}_2025-01`,
      year: 2025,
      month: 1,
      income: 500000,
      expense: 0,
      closingBalance: 500000,
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
    // Total Assets = 100,000 (Cash) + 50,000 (Investment) + 10,000 (Other) + 500,000 (Real Estate) = 660,000
    expect(reports.balanceSheet.data.assets.total).toBe(660000);

    // Check types
    const data = reports.balanceSheet.data as BalanceSheetData;
    const cash = data.assets.items.find((i) => i.category === AssetSubCategory.CASH); // AssetSubCategory.CASH
    expect(cash).toBeDefined();
    expect(cash?.amount).toBe(100000);

    const investment = data.assets.items.find((i) => i.category === AssetSubCategory.INVESTMENTS); // AssetSubCategory.INVESTMENT
    expect(investment).toBeDefined();
    expect(investment?.amount).toBe(50000);

    const other = data.assets.items.find((i) => i.category === AssetSubCategory.OTHER_ASSETS); // AssetSubCategory.OTHER
    expect(other).toBeDefined();
    expect(other?.amount).toBe(10000);

    const realEstate = data.assets.items.find((i) => i.category === AssetSubCategory.REAL_ESTATE); // AssetSubCategory.REAL_ESTATE
    expect(realEstate).toBeDefined();
    expect(realEstate?.amount).toBe(500000);
  });

  it('should calculate Liabilities correctly from Project Snapshots', async () => {
    // 1. Liability Project (Mortgage)
    const projectId = 'proj_mortgage';
    mockDb[`households/${householdId}/projects/${projectId}`] = {
      id: projectId,
      name: 'Mortgage',
      category: ProjectCategory.LIABILITY,
      accounting: {
        enabled: true,
        balanceSheet: {
          category: BalanceSheetCategory.LIABILITY,
          subcategory: LiabilitySubCategory.LONG_TERM_DEBT,
        },
      },
      createdAt: Timestamp.now(),
    };
    // Project Snapshot (5,000,000)
    mockDb[`households/${householdId}/projects/${projectId}/snapshots/2025-01`] = {
      id: '2025-01',
      year: 2025,
      month: 1,
      income: 0,
      expense: 0,
      closingBalance: 5000000,
      openingBalance: 5005000, // Reduced by 5000
      createdAt: Timestamp.now(),
    };

    // 2. Liability Project (Credit Card)
    const projectId2 = 'proj_creditCard';
    mockDb[`households/${householdId}/projects/${projectId2}`] = {
      id: projectId2,
      name: 'Credit Card',
      category: ProjectCategory.LIABILITY,
      accounting: {
        enabled: true,
        balanceSheet: {
          category: BalanceSheetCategory.LIABILITY,
          subcategory: LiabilitySubCategory.SHORT_TERM_DEBT,
        },
      },
      createdAt: Timestamp.now(),
    };
    // Project Snapshot (5,000)
    mockDb[`households/${householdId}/projects/${projectId2}/snapshots/2025-01`] = {
      id: '2025-01',
      year: 2025,
      month: 1,
      income: 0,
      expense: 0,
      closingBalance: 5000,
      openingBalance: 5000,
      createdAt: Timestamp.now(),
    };

    // 3. Other Liability Project (Loan)
    const projectId3 = 'proj_loan';
    mockDb[`households/${householdId}/projects/${projectId3}`] = {
      id: projectId3,
      name: 'Loan',
      category: ProjectCategory.LIABILITY,
      accounting: {
        enabled: true,
        balanceSheet: {
          category: BalanceSheetCategory.LIABILITY,
          subcategory: LiabilitySubCategory.OTHER_LIABILITIES,
        },
      },
      createdAt: Timestamp.now(),
    };
    // Project Snapshot (10,000)
    mockDb[`households/${householdId}/projects/${projectId3}/snapshots/2025-01`] = {
      id: '2025-01',
      year: 2025,
      month: 1,
      income: 0,
      expense: 0,
      closingBalance: 10000,
      openingBalance: 10000,
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
    // Liabilities = 5,000,000 (Long Term Debt) + 5,000 (Short Term Debt) + 10,000 (Other Liabilities) = 5,015,000
    expect(reports.balanceSheet.data.liabilities.total).toBe(5015000);

    const data = reports.balanceSheet.data as BalanceSheetData;
    const item = data.liabilities.items.find(
      (i) => i.category === LiabilitySubCategory.LONG_TERM_DEBT,
    );
    expect(item).toBeDefined();
    expect(item?.amount).toBe(5000000);

    const item2 = data.liabilities.items.find(
      (i) => i.category === LiabilitySubCategory.SHORT_TERM_DEBT,
    );
    expect(item2).toBeDefined();
    expect(item2?.amount).toBe(5000);

    const item3 = data.liabilities.items.find(
      (i) => i.category === LiabilitySubCategory.OTHER_LIABILITIES,
    );
    expect(item3).toBeDefined();
    expect(item3?.amount).toBe(10000);
  });

  it('should calculate Equity correctly from Project Snapshots', async () => {
    // 1. Equity Project (Retained Earnings)
    const projectId4 = 'proj_equity';
    mockDb[`households/${householdId}/projects/${projectId4}`] = {
      id: projectId4,
      name: 'Retained Earnings',
      category: ProjectCategory.OPERATING,
      accounting: {
        enabled: true,
        balanceSheet: {
          category: BalanceSheetCategory.EQUITY,
          subcategory: EquitySubCategory.RETAINED_EARNINGS,
        },
      },
      createdAt: Timestamp.now(),
    };
    // Project Snapshot (10,000)
    mockDb[`households/${householdId}/projects/${projectId4}/snapshots/2025-01`] = {
      id: '2025-01',
      year: 2025,
      month: 1,
      income: 0,
      expense: 0,
      closingBalance: 10000,
      openingBalance: 10000,
      createdAt: Timestamp.now(),
    };

    // 2. Equity Project (Owner Investments)
    const projectId5 = 'proj_equity2';
    mockDb[`households/${householdId}/projects/${projectId5}`] = {
      id: projectId5,
      name: 'Owner Investments',
      category: ProjectCategory.OPERATING,
      accounting: {
        enabled: true,
        balanceSheet: {
          category: BalanceSheetCategory.EQUITY,
          subcategory: EquitySubCategory.OWNER_INVESTMENTS,
        },
      },
      createdAt: Timestamp.now(),
    };
    // Project Snapshot (50,000)
    mockDb[`households/${householdId}/projects/${projectId5}/snapshots/2025-01`] = {
      id: '2025-01',
      year: 2025,
      month: 1,
      income: 0,
      expense: 0,
      closingBalance: 50000,
      openingBalance: 50000,
      createdAt: Timestamp.now(),
    };

    // 3. Equity Project (Stock profit)
    const projectId6 = 'proj_equity3';
    mockDb[`households/${householdId}/projects/${projectId6}`] = {
      id: projectId6,
      name: 'Stock Profit',
      category: ProjectCategory.OPERATING,
      accounting: {
        enabled: true,
        balanceSheet: {
          category: BalanceSheetCategory.EQUITY,
          subcategory: EquitySubCategory.STOCK_PROFIT,
        },
      },
      createdAt: Timestamp.now(),
    };
    // Project Snapshot (100,000)
    mockDb[`households/${householdId}/projects/${projectId6}/snapshots/2025-01`] = {
      id: '2025-01',
      year: 2025,
      month: 1,
      income: 0,
      expense: 0,
      closingBalance: 100000,
      openingBalance: 100000,
      createdAt: Timestamp.now(),
    };

    // 4. Equity Project (Other)
    const projectId7 = 'proj_equity4';
    mockDb[`households/${householdId}/projects/${projectId7}`] = {
      id: projectId7,
      name: 'Other Equity',
      category: ProjectCategory.OPERATING,
      accounting: {
        enabled: true,
        balanceSheet: {
          category: BalanceSheetCategory.EQUITY,
          subcategory: EquitySubCategory.OTHER_EQUITY,
        },
      },
      createdAt: Timestamp.now(),
    };
    // Project Snapshot (1,000)
    mockDb[`households/${householdId}/projects/${projectId7}/snapshots/2025-01`] = {
      id: '2025-01',
      year: 2025,
      month: 1,
      income: 0,
      expense: 0,
      closingBalance: 1000,
      openingBalance: 1000,
      createdAt: Timestamp.now(),
    };

    // 5. Add Balancing Asset (Bank Account)
    const accountId = 'acc_equity_balance';
    mockDb[`households/${householdId}/accounts/${accountId}`] = {
      id: accountId,
      name: 'Equity Balancing Account',
      type: 'bank',
      category: AccountCategory.BANK,
      currency: CurrencyType.TWD,
      createdAt: Timestamp.now(),
    };
    mockDb[`households/${householdId}/accounts/${accountId}/snapshots/${accountId}_2025-01`] = {
      id: `${accountId}_2025-01`,
      year: 2025,
      month: 1,
      amount: 161000,
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
    // Equity = 10,000 (Retained Earnings) + 50,000 (Owner Investments) + 100,000 (Stock Profit) + 1,000 (Other Equity)
    expect(reports.balanceSheet.data.equity.total).toBe(161000);

    const data = reports.balanceSheet.data as BalanceSheetData;
    const item = data.equity.items.find((i) => i.category === EquitySubCategory.RETAINED_EARNINGS);
    expect(item).toBeDefined();
    expect(item?.amount).toBe(10000);

    const item2 = data.equity.items.find((i) => i.category === EquitySubCategory.OWNER_INVESTMENTS);
    expect(item2).toBeDefined();
    expect(item2?.amount).toBe(50000);

    const item3 = data.equity.items.find((i) => i.category === EquitySubCategory.STOCK_PROFIT);
    expect(item3).toBeDefined();
    expect(item3?.amount).toBe(100000);

    const item4 = data.equity.items.find((i) => i.category === EquitySubCategory.OTHER_EQUITY);
    expect(item4).toBeDefined();
    expect(item4?.amount).toBe(1000);
  });
});
