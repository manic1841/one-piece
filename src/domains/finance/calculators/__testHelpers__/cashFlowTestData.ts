import {
  CashFlowCategory,
  FinancingSubCategory,
  InvestingSubCategory,
  OperatingSubCategory,
} from '@/domains/finance/types/categories';
import type { ProjectWithSnapshot } from '@/domains/project/types';
import { createProjectWithSnapshot } from '@/test/factory/factories';

// Test case: Operating activities with income and expense
export const operatingData = {
  projects: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Consulting Revenue',
        accounting: {
          enabled: true,
          cashFlow: {
            category: CashFlowCategory.OPERATING,
            subcategory: OperatingSubCategory.REGULAR_OPERATIONS,
          },
        },
      },
      {
        income: 10000,
        expense: 0,
        closingBalance: 10000,
      },
    ),
    createProjectWithSnapshot(
      {
        id: 'project2',
        name: 'Office Rent',
        accounting: {
          enabled: true,
          cashFlow: {
            category: CashFlowCategory.OPERATING,
            subcategory: OperatingSubCategory.OTHER_OPERATING,
          },
        },
      },
      {
        income: 0,
        expense: 3000,
        closingBalance: -3000,
      },
    ),
  ],
  beginningCash: 50000,
};

// Test case: Investing activities
export const investingData = {
  projects: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Equipment Purchase',
        accounting: {
          enabled: true,
          cashFlow: {
            category: CashFlowCategory.INVESTING,
            subcategory: InvestingSubCategory.PURCHASE_ASSETS,
          },
        },
      },
      {
        income: 0,
        expense: 5000,
        closingBalance: -5000,
      },
    ),
    createProjectWithSnapshot(
      {
        id: 'project2',
        name: 'Investment Sale',
        accounting: {
          enabled: true,
          cashFlow: {
            category: CashFlowCategory.INVESTING,
            subcategory: InvestingSubCategory.STOCK_INVESTMENTS,
          },
        },
      },
      {
        income: 2000,
        expense: 0,
        closingBalance: 2000,
      },
    ),
  ],
  beginningCash: 50000,
};

// Test case: Financing activities
export const financingData = {
  projects: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Bank Loan',
        accounting: {
          enabled: true,
          cashFlow: {
            category: CashFlowCategory.FINANCING,
            subcategory: FinancingSubCategory.LONG_TERM_LOANS,
          },
        },
      },
      {
        income: 20000,
        expense: 0,
        closingBalance: 20000,
      },
    ),
    createProjectWithSnapshot(
      {
        id: 'project2',
        name: 'Loan Repayment',
        accounting: {
          enabled: true,
          cashFlow: {
            category: CashFlowCategory.FINANCING,
            subcategory: FinancingSubCategory.LONG_TERM_LOANS,
          },
        },
      },
      {
        income: 0,
        expense: 5000,
        closingBalance: -5000,
      },
    ),
  ],
  beginningCash: 50000,
};

// Test case: All three categories combined
export const allCategoriesData = {
  projects: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Sales',
        accounting: {
          enabled: true,
          cashFlow: {
            category: CashFlowCategory.OPERATING,
            subcategory: OperatingSubCategory.REGULAR_OPERATIONS,
          },
        },
      },
      {
        income: 15000,
        expense: 0,
        closingBalance: 15000,
      },
    ),
    createProjectWithSnapshot(
      {
        id: 'project2',
        name: 'Equipment',
        accounting: {
          enabled: true,
          cashFlow: {
            category: CashFlowCategory.INVESTING,
            subcategory: InvestingSubCategory.PURCHASE_ASSETS,
          },
        },
      },
      {
        income: 0,
        expense: 3000,
        closingBalance: -3000,
      },
    ),
    createProjectWithSnapshot(
      {
        id: 'project3',
        name: 'Loan',
        accounting: {
          enabled: true,
          cashFlow: {
            category: CashFlowCategory.FINANCING,
            subcategory: FinancingSubCategory.LONG_TERM_LOANS,
          },
        },
      },
      {
        income: 10000,
        expense: 0,
        closingBalance: 10000,
      },
    ),
  ],
  beginningCash: 50000,
};

// Test case: Projects without cashFlow accounting
export const noAccountingData = {
  projects: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'No Accounting',
        accounting: undefined,
      },
      {
        income: 5000,
        expense: 2000,
        closingBalance: 3000,
      },
    ),
  ],
  beginningCash: 50000,
};

// Test case: Empty projects
export const emptyData = {
  projects: [] as ProjectWithSnapshot[],
  beginningCash: 50000,
};

// Test case: Aggregation of same subcategory
export const aggregationData = {
  projects: [
    createProjectWithSnapshot(
      {
        id: 'project1',
        name: 'Sales A',
        accounting: {
          enabled: true,
          cashFlow: {
            category: CashFlowCategory.OPERATING,
            subcategory: OperatingSubCategory.REGULAR_OPERATIONS,
          },
        },
      },
      {
        income: 5000,
        expense: 0,
        closingBalance: 5000,
      },
    ),
    createProjectWithSnapshot(
      {
        id: 'project2',
        name: 'Sales B',
        accounting: {
          enabled: true,
          cashFlow: {
            category: CashFlowCategory.OPERATING,
            subcategory: OperatingSubCategory.REGULAR_OPERATIONS,
          },
        },
      },
      {
        income: 3000,
        expense: 0,
        closingBalance: 3000,
      },
    ),
  ],
  beginningCash: 50000,
};
