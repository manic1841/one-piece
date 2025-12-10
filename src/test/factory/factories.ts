import {
  AssetSubCategory,
  BalanceSheetCategory,
  CashFlowCategory,
  ExpenseSubCategory,
  IncomeStatementCategory,
  OperatingSubCategory,
} from '@/domains/finance/types';
import type { ProjectWithSnapshot } from '@/domains/project/types';
import type { AccountSnapshot } from '@/schemas/account';
import type { BalanceSheetData, BalanceSheetItem } from '@/schemas/balanceSheet';
import type { CashFlowData } from '@/schemas/cashFlow';
import type { PlannedIncome } from '@/schemas/plannedIncome';
import type { Project, ProjectSnapshot } from '@/schemas/project';
import type { Transaction } from '@/schemas/transaction';

/**
 * Test Factory Functions
 * These factories create mock data objects for testing purposes
 */

// Factory: PlannedIncome
export function createPlannedIncome(overrides?: Partial<PlannedIncome>): PlannedIncome {
  return {
    id: 'pi-test-1',
    date: new Date(),
    amount: 50000,
    category: 'salary',
    description: 'Test Salary',
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedBy: 'test-user',
    updatedAt: new Date(),
    allocations: [],
    ...overrides,
  };
}

// Factory: Transaction
export function createTransaction(overrides?: Partial<Transaction>): Transaction {
  return {
    id: 'tx-test-1',
    projectId: 'project-test-1',
    date: new Date(),
    type: 'expense',
    category: 'Food',
    amount: 500,
    description: 'Test Transaction',
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedBy: 'test-user',
    updatedAt: new Date(),
    ...overrides,
  };
}

// Factory: Project
export function createProject(overrides?: Partial<Project>): Project {
  return {
    id: 'project-test-1',
    name: 'Test Project',
    icon: '💰',
    color: '#3b82f6',
    order: 0,
    category: 'operating',
    isActive: true,
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedBy: 'test-user',
    updatedAt: new Date(),
    accounting: {
      enabled: false,
      incomeStatement: {
        category: IncomeStatementCategory.EXPENSE,
        subcategory: ExpenseSubCategory.LIVING,
      },
      cashFlow: {
        category: CashFlowCategory.OPERATING,
        subcategory: OperatingSubCategory.REGULAR_OPERATIONS,
      },
      balanceSheet: {
        category: BalanceSheetCategory.ASSET,
        subcategory: AssetSubCategory.CASH,
      },
    },
    ...overrides,
  };
}

// Factory: ProjectSnapshot
export function createProjectSnapshot(overrides?: Partial<ProjectSnapshot>): ProjectSnapshot {
  return {
    id: 'project-test-1',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    openingBalance: 0,
    income: 0,
    expense: 1000,
    closingBalance: -1000,
    createdAt: new Date(),
    createdBy: '',
    updatedAt: new Date(),
    updatedBy: '',
    ...overrides,
  };
}

// Factory: Project with Snapshot
export function createProjectWithSnapshot(
  projectOverrides: Partial<Project> = {},
  snapshotOverrides: Partial<ProjectSnapshot> | null = {},
): ProjectWithSnapshot {
  const project = createProject(projectOverrides);
  return {
    ...project,
    snapshot: snapshotOverrides === null ? null : createProjectSnapshot({ ...snapshotOverrides }),
  };
}

// Factory: AccountSnapshot
export function createAccountSnapshot(overrides?: Partial<AccountSnapshot>): AccountSnapshot {
  return {
    id: 'account-test-1',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    amount: 10000,
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy: 'test-user',
    ...overrides,
  };
}

// Batch Factory: Create multiple PlannedIncomes
export function createPlannedIncomes(
  count: number,
  overrides?: Partial<PlannedIncome>,
): PlannedIncome[] {
  return Array.from({ length: count }, (_, i) =>
    createPlannedIncome({
      id: `pi-test-${i + 1}`,
      ...overrides,
    }),
  );
}

// Batch Factory: Create multiple Transactions
export function createTransactions(count: number, overrides?: Partial<Transaction>): Transaction[] {
  return Array.from({ length: count }, (_, i) =>
    createTransaction({
      id: `tx-test-${i + 1}`,
      ...overrides,
    }),
  );
}

// Batch Factory: Create multiple Projects
export function createProjects(count: number, overrides?: Partial<Project>): Project[] {
  return Array.from({ length: count }, (_, i) =>
    createProject({
      id: `project-test-${i + 1}`,
      name: `Test Project ${i + 1}`,
      ...overrides,
    }),
  );
}

// Batch Factory: Create multiple ProjectSnapshots
export function createProjectSnapshots(
  count: number,
  overrides?: Partial<ProjectSnapshot>,
): ProjectSnapshot[] {
  return Array.from({ length: count }, (_, i) =>
    createProjectSnapshot({
      id: `project-test-${i + 1}`,
      ...overrides,
    }),
  );
}

// Batch Factory: Create multiple AccountSnapshots
export function createAccountSnapshots(
  count: number,
  overrides?: Partial<AccountSnapshot>,
): AccountSnapshot[] {
  return Array.from({ length: count }, (_, i) =>
    createAccountSnapshot({
      id: `account-test-${i + 1}`,
      ...overrides,
    }),
  );
}

export function createCashFlow(
  endingBalance: number,
  beginningBalance: number = 50000,
  netChange: number = 0,
): CashFlowData {
  return {
    operating: {
      income: [],
      expense: [],
      netAmount: netChange,
      items: [],
    },
    investing: {
      income: [],
      expense: [],
      netAmount: 0,
      items: [],
    },
    financing: {
      income: [],
      expense: [],
      netAmount: 0,
      items: [],
    },
    netChange,
    beginningBalance,
    endingBalance,
  };
}

export function createBalanceSheet(
  cashAmount: number,
  liabilitiesTotal: number,
  equityTotal: number,
  includeInvestments: boolean = false,
): BalanceSheetData {
  const assetItems: BalanceSheetItem[] = [
    {
      category: AssetSubCategory.CASH,
      amount: cashAmount,
      subItems: [],
    },
  ];

  if (includeInvestments) {
    assetItems.push({
      category: AssetSubCategory.INVESTMENTS,
      amount: 50000,
      subItems: [],
    });
  }

  const assetsTotal = assetItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    assets: {
      total: assetsTotal,
      items: assetItems,
    },
    liabilities: {
      total: liabilitiesTotal,
      items:
        liabilitiesTotal > 0
          ? [
              {
                category: 'Short-term Debt',
                amount: liabilitiesTotal,
                subItems: [],
              },
            ]
          : [],
    },
    equity: {
      total: equityTotal,
      items:
        equityTotal > 0
          ? [
              {
                category: 'Retained Earnings',
                amount: equityTotal,
                subItems: [],
              },
            ]
          : [],
    },
  };
}
