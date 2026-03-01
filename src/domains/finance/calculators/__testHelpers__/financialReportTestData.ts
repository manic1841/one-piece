import { AssetSubCategory } from '@/domains/finance/types/categories';
import type { BalanceSheetData } from '@/schemas/balanceSheet';
import { createBalanceSheet, createCashFlow } from '@/test/factory';

// Test case: Full reconciliation (cash matches + balance sheet equation holds)
export const reconciledData = {
  balanceSheet: createBalanceSheet(50000, 30000, 70000, true),
  cashFlow: createCashFlow(50000, 45000, 5000),
};

// Test case: Cash does not match
export const cashMismatchData = {
  balanceSheet: createBalanceSheet(55000, 30000, 70000),
  cashFlow: createCashFlow(50000),
};

// Test case: Balance sheet equation does not hold
export const equationMismatchData = {
  balanceSheet: {
    assets: {
      total: 100000,
      items: [
        {
          category: AssetSubCategory.CASH,
          amount: 50000,
          subItems: [],
        },
        {
          category: AssetSubCategory.INVESTMENTS,
          amount: 50000,
          subItems: [],
        },
      ],
    },
    liabilities: {
      total: 30000,
      items: [],
    },
    equity: {
      total: 60000, // 100000 != (30000 + 60000) = 90000
      items: [],
    },
  } as BalanceSheetData,
  cashFlow: createCashFlow(50000),
};

// Test case: Missing cash asset in balance sheet
export const missingCashData = {
  balanceSheet: {
    assets: {
      total: 100000,
      items: [
        {
          category: AssetSubCategory.INVESTMENTS,
          amount: 100000,
          subItems: [],
        },
      ],
    },
    liabilities: {
      total: 30000,
      items: [],
    },
    equity: {
      total: 70000,
      items: [],
    },
  } as BalanceSheetData,
  cashFlow: createCashFlow(50000),
};

// Test case: Floating point tolerance
export const floatingPointData = {
  balanceSheet: {
    assets: {
      total: 100000.005,
      items: [
        {
          category: AssetSubCategory.CASH,
          amount: 50000.003,
          subItems: [],
        },
      ],
    },
    liabilities: {
      total: 30000,
      items: [],
    },
    equity: {
      total: 70000.005,
      items: [],
    },
  } as BalanceSheetData,
  cashFlow: createCashFlow(50000.001, 50000, 0),
};

// Test case: Prioritize balance sheet difference when cash is reconciled
export const priorityBalanceSheetData = {
  balanceSheet: {
    assets: {
      total: 100000,
      items: [
        {
          category: AssetSubCategory.CASH,
          amount: 50000,
          subItems: [],
        },
        {
          category: AssetSubCategory.INVESTMENTS,
          amount: 50000,
          subItems: [],
        },
      ],
    },
    liabilities: {
      total: 30000,
      items: [],
    },
    equity: {
      total: 60000, // Cash matches but equation doesn't: 100000 != 90000
      items: [],
    },
  } as BalanceSheetData,
  cashFlow: createCashFlow(50000),
};

// Test case: Show cash difference when cash is not reconciled
export const priorityCashData = {
  balanceSheet: createBalanceSheet(60000, 40000, 60000), // Both cash and equation mismatch
  cashFlow: createCashFlow(50000),
};
