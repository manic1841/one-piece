import { Timestamp } from 'firebase/firestore';
import type { PlannedIncome } from '../schemas/plannedIncome';
import type { Transaction } from '../schemas/transaction';
import type { Project, ProjectSnapshot } from '../schemas/project';
import type { AccountSnapshot } from '../schemas/account';

/**
 * Test Factory Functions
 * These factories create mock data objects for testing purposes
 */

// Factory: PlannedIncome
export function createPlannedIncome(overrides?: Partial<PlannedIncome>): PlannedIncome {
    return {
        id: 'pi-test-1',
        date: Timestamp.now(),
        amount: 50000,
        category: 'salary',
        description: 'Test Salary',
        createdBy: 'test-user',
        createdAt: Timestamp.now(),
        allocations: [],
        ...overrides,
    };
}

// Factory: Transaction
export function createTransaction(overrides?: Partial<Transaction>): Transaction {
    return {
        id: 'tx-test-1',
        projectId: 'project-test-1',
        date: Timestamp.now(),
        type: 'expense',
        category: 'Food',
        amount: 500,
        description: 'Test Transaction',
        createdBy: 'test-user',
        createdAt: Timestamp.now(),
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
        isPersonal: false,
        isActive: true,
        createdBy: 'test-user',
        createdAt: Timestamp.now(),
        accounting: {
            enabled: false,
            incomeStatement: {
                category: 'expense',
                subcategory: 'Living',
            },
            cashFlow: {
                activity: 'operating',
                subcategory: 'daily-expenses',
            },
            balanceSheet: {
                category: 'asset',
                subcategory: 'current',
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
        createdAt: Timestamp.now(),
        ...overrides,
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
        createdAt: Timestamp.now(),
        ...overrides,
    };
}

// Batch Factory: Create multiple PlannedIncomes
export function createPlannedIncomes(count: number, overrides?: Partial<PlannedIncome>): PlannedIncome[] {
    return Array.from({ length: count }, (_, i) =>
        createPlannedIncome({
            id: `pi-test-${i + 1}`,
            ...overrides
        })
    );
}

// Batch Factory: Create multiple Transactions
export function createTransactions(count: number, overrides?: Partial<Transaction>): Transaction[] {
    return Array.from({ length: count }, (_, i) =>
        createTransaction({
            id: `tx-test-${i + 1}`,
            ...overrides
        })
    );
}

// Batch Factory: Create multiple Projects
export function createProjects(count: number, overrides?: Partial<Project>): Project[] {
    return Array.from({ length: count }, (_, i) =>
        createProject({
            id: `project-test-${i + 1}`,
            name: `Test Project ${i + 1}`,
            ...overrides
        })
    );
}

// Batch Factory: Create multiple ProjectSnapshots
export function createProjectSnapshots(count: number, overrides?: Partial<ProjectSnapshot>): ProjectSnapshot[] {
    return Array.from({ length: count }, (_, i) =>
        createProjectSnapshot({
            id: `project-test-${i + 1}`,
            ...overrides
        })
    );
}

// Batch Factory: Create multiple AccountSnapshots
export function createAccountSnapshots(count: number, overrides?: Partial<AccountSnapshot>): AccountSnapshot[] {
    return Array.from({ length: count }, (_, i) =>
        createAccountSnapshot({
            id: `account-test-${i + 1}`,
            ...overrides
        })
    );
}
