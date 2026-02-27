import type { AccountWithSnapshot } from '@/domains/account/types';
import {
  AssetSubCategory,
  BalanceSheetCategory,
  EquitySubCategory,
  LiabilitySubCategory,
} from '@/domains/finance/types';
import type { ProjectWithSnapshot } from '@/domains/project/types';
import { createAccountSnapshot, createProjectWithSnapshot } from '@/test/factory/factories';

// Test data sets
export const cashAccountsData = {
  accountSnapshots: [
    {
      id: 'account1',
      name: 'Cash 1',
      category: 'cash',
      snapshot: createAccountSnapshot({
        id: 'account1',
        amount: 1000,
      }),
    },
    {
      id: 'account2',
      name: 'Cash 2',
      category: 'bank',
      snapshot: createAccountSnapshot({
        id: 'account2',
        amount: 2000,
      }),
    },
  ],
  projectsWithSnapshots: [] as ProjectWithSnapshot[],
};

export const investmentData = {
  projectsWithSnapshots: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Stock Investment',
        accounting: {
          enabled: true,
          balanceSheet: {
            category: BalanceSheetCategory.ASSET,
            subcategory: AssetSubCategory.INVESTMENTS,
          },
        },
      },
      {
        id: 'snapshot1',
        openingBalance: 0,
        closingBalance: 5000,
        income: 5000,
        expense: 0,
      },
    ),
  ],
  accountWithSnapshots: [] as AccountWithSnapshot[],
};

export const assetsData = {
  projectsWithSnapshots: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Real Estate',
        accounting: {
          enabled: true,
          balanceSheet: {
            category: BalanceSheetCategory.ASSET,
            subcategory: AssetSubCategory.REAL_ESTATE,
          },
        },
      },
      {
        openingBalance: 0,
        closingBalance: 10000,
        income: 10000,
        expense: 0,
      },
    ),
    createProjectWithSnapshot(
      {
        id: 'project2',
        name: 'Equipment',
        accounting: {
          enabled: true,
          balanceSheet: {
            category: BalanceSheetCategory.ASSET,
            subcategory: AssetSubCategory.OTHER_ASSETS,
          },
        },
      },
      {
        openingBalance: 0,
        closingBalance: 3000,
        income: 3000,
        expense: 0,
      },
    ),
  ],
  accountWithSnapshots: [] as AccountWithSnapshot[],
};

export const liabilitiesData = {
  projectsWithSnapshots: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Bank Loan',
        accounting: {
          enabled: true,
          balanceSheet: {
            category: BalanceSheetCategory.LIABILITY,
            subcategory: LiabilitySubCategory.LONG_TERM_DEBT,
          },
        },
      },
      {
        openingBalance: 0,
        closingBalance: 5000,
        income: 0,
        expense: 5000,
      },
    ),
  ],
  accountWithSnapshots: [] as AccountWithSnapshot[],
};

export const equityData = {
  projectsWithSnapshots: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Owner Equity',
        accounting: {
          enabled: true,
          balanceSheet: {
            category: BalanceSheetCategory.EQUITY,
            subcategory: EquitySubCategory.OWNER_INVESTMENTS,
          },
        },
      },
      {
        openingBalance: 0,
        closingBalance: 8000,
        income: 8000,
        expense: 0,
      },
    ),
  ],
  accountWithSnapshots: [] as AccountWithSnapshot[],
};

export const mixedBalanceSheetData = {
  accountSnapshots: [
    {
      id: 'account1',
      name: 'Cash 1',
      category: 'cash',
      snapshot: createAccountSnapshot({
        id: 'account1',
        amount: 1000,
      }),
    },
  ],
  projectsWithSnapshots: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Stock Investment',
        accounting: {
          enabled: true,
          balanceSheet: {
            category: BalanceSheetCategory.ASSET,
            subcategory: AssetSubCategory.INVESTMENTS,
          },
        },
      },
      {
        openingBalance: 0,
        closingBalance: 5000,
        income: 5000,
        expense: 0,
      },
    ),
    createProjectWithSnapshot(
      {
        id: 'project2',
        name: 'Bank Loan',
        accounting: {
          enabled: true,
          balanceSheet: {
            category: BalanceSheetCategory.LIABILITY,
            subcategory: LiabilitySubCategory.LONG_TERM_DEBT,
          },
        },
      },
      {
        openingBalance: 0,
        closingBalance: 3000,
        income: 0,
        expense: 3000,
      },
    ),
    createProjectWithSnapshot(
      {
        id: 'project3',
        name: 'Owner Equity',
        accounting: {
          enabled: true,
          balanceSheet: {
            category: BalanceSheetCategory.EQUITY,
            subcategory: EquitySubCategory.OWNER_INVESTMENTS,
          },
        },
      },
      {
        openingBalance: 0,
        closingBalance: 3000,
        income: 3000,
        expense: 0,
      },
    ),
  ],
};

export const emptyData = {
  accountWithSnapshots: [] as AccountWithSnapshot[],
  projectsWithSnapshots: [] as ProjectWithSnapshot[],
};

export const aggregationData = {
  accountSnapshots: [
    {
      id: 'account1',
      name: 'Cash 1',
      category: 'cash',
      snapshot: createAccountSnapshot({
        id: 'account1',
        amount: 1000,
      }),
    },
    {
      id: 'account2',
      name: 'Cash 2',
      category: 'cash',
      snapshot: createAccountSnapshot({
        id: 'account2',
        amount: 2000,
      }),
    },
  ],
  projectsWithSnapshots: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Stock A',
        accounting: {
          enabled: true,
          balanceSheet: {
            category: BalanceSheetCategory.ASSET,
            subcategory: AssetSubCategory.INVESTMENTS,
          },
        },
      },
      {
        openingBalance: 0,
        closingBalance: 3000,
        income: 3000,
        expense: 0,
      },
    ),
    createProjectWithSnapshot(
      {
        id: 'project2',
        name: 'Stock B',
        accounting: {
          enabled: true,
          balanceSheet: {
            category: BalanceSheetCategory.ASSET,
            subcategory: AssetSubCategory.INVESTMENTS,
          },
        },
      },
      {
        openingBalance: 0,
        closingBalance: 2000,
        income: 2000,
        expense: 0,
      },
    ),
  ],
};
