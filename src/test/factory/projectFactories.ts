import {
  AssetSubCategory,
  BalanceSheetCategory,
  CashFlowCategory,
  ExpenseSubCategory,
  IncomeStatementCategory,
  OperatingSubCategory,
} from '@/domains/finance/types';
import type { ProjectWithSnapshot } from '@/domains/project/types';
import type { Project, ProjectSnapshot } from '@/schemas/project';

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
