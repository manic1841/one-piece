import { describe, it, expect, vi, beforeEach } from 'vitest';
import { budgetService } from '../budgetService';
import { transactionService } from '../transactionService';
import { projectTransactionService } from '../projectTransactionService';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

// In-memory DB mock
const mockDb: Record<string, unknown> = {};

vi.mock('firebase/firestore', () => {
  return {
    getFirestore: vi.fn(),
    collection: vi.fn((db, ...pathSegments) => ({
      type: 'collection',
      path: pathSegments.join('/'),
    })),
    doc: vi.fn((refOrDb, ...pathSegments) => {
      if (refOrDb.type === 'collection') {
        const newId = 'new-id-' + Math.random().toString(36).substr(2, 9);
        return { id: newId, path: refOrDb.path + '/' + newId };
      }
      const path = pathSegments.join('/');
      return { id: pathSegments[pathSegments.length - 1], path };
    }),
    setDoc: vi.fn(async (ref, data) => {
      mockDb[ref.path] = data;
    }),
    updateDoc: vi.fn(async (ref, data) => {
      mockDb[ref.path] = { ...(mockDb[ref.path] as object), ...data };
    }),
    deleteDoc: vi.fn(async (ref) => {
      delete mockDb[ref.path];
    }),
    getDoc: vi.fn(async (ref) => ({
      exists: () => !!mockDb[ref.path],
      data: () => mockDb[ref.path],
      id: ref.id,
    })),
    getDocs: vi.fn(async (query) => {
      const collectionPath = (query as { path: string }).path;
      if (!collectionPath) return { empty: true, docs: [], size: 0 };

      const docs = Object.keys(mockDb)
        .filter((key) => key.startsWith(collectionPath + '/'))
        .map((key) => ({
          id: key.split('/').pop(),
          data: () => mockDb[key],
        }));

      return {
        empty: docs.length === 0,
        docs,
        size: docs.length,
      };
    }),
    query: vi.fn((collectionRef, ...constraints) => {
      return { path: collectionRef.path, constraints };
    }),
    where: vi.fn(),
    orderBy: vi.fn(),
    serverTimestamp: vi.fn(() => Timestamp.now()),
    runTransaction: vi.fn(async (db, callback) => {
      const transaction = {
        get: async (ref: { path: string; id: string }) => ({
          exists: () => !!mockDb[ref.path],
          data: () => mockDb[ref.path],
          id: ref.id,
        }),
        set: (ref: { path: string }, data: unknown) => {
          mockDb[ref.path] = data;
        },
        update: (ref: { path: string }, data: unknown) => {
          mockDb[ref.path] = { ...(mockDb[ref.path] as object), ...(data as object) };
        },
        delete: (ref: { path: string }) => {
          delete mockDb[ref.path];
        },
      };
      return callback(transaction);
    }),
    Timestamp: class {
      seconds: number;
      nanoseconds: number;
      constructor(seconds: number, nanoseconds: number) {
        this.seconds = seconds;
        this.nanoseconds = nanoseconds;
      }
      toDate() {
        return new Date(this.seconds * 1000 + this.nanoseconds / 1000000);
      }
      static fromDate(date: Date) {
        return new this(Math.floor(date.getTime() / 1000), (date.getTime() % 1000) * 1000000);
      }
      static now() {
        return this.fromDate(new Date());
      }
    },
  };
});

vi.mock('../../firebase', () => ({
  db: {},
}));

describe('Budget Tracking Integration Flow', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in mockDb) delete mockDb[key];
  });

  it('should track budget usage correctly', async () => {
    // 1. Setup household with budget allocations
    mockDb[`households/${householdId}`] = {
      id: householdId,
      name: 'Test Household',
      budgetAllocations: [
        { projectId: 'proj-1', percentage: 50 },
        { projectId: 'proj-2', percentage: 50 },
      ],
    };

    // Create projects
    mockDb[`households/${householdId}/projects/proj-1`] = {
      id: 'proj-1',
      name: 'Project 1',
      color: 'red',
      icon: 'icon',
    };
    mockDb[`households/${householdId}/projects/proj-2`] = {
      id: 'proj-2',
      name: 'Project 2',
      color: 'blue',
      icon: 'icon',
    };

    // 2. Create Transactions
    const incomeTx = {
      type: 'income' as const,
      amount: 2000,
      category: 'salary' as const,
      projectId: 'proj-1',
      date: Timestamp.fromDate(new Date('2023-11-05')),
      description: 'Salary',
      createdBy: 'user-1',
    };
    await transactionService.createTransaction(householdId, incomeTx);

    // Create allocation (Project Transaction)
    const allocationTx = {
      type: 'allocation' as const,
      amount: 1000,
      toProject: 'proj-1',
      date: Timestamp.fromDate(new Date('2023-11-05')),
      description: 'Allocation from Salary',
      createdBy: 'user-1',
    };
    await projectTransactionService.createProjectTransaction(householdId, allocationTx);

    const expenseTx = {
      type: 'expense' as const,
      amount: 800,
      category: 'food' as const,
      projectId: 'proj-1',
      date: Timestamp.fromDate(new Date('2023-11-10')),
      description: 'Groceries',
      createdBy: 'user-1',
    };
    await transactionService.createTransaction(householdId, expenseTx);

    // 3. Calculate Monthly Budget
    const report = await budgetService.calculateMonthlyBudget(householdId, 2023, 11);

    // 4. Verify Report
    expect(report.totalIncome).toBe(2000);
    expect(report.budgets['proj-1']).toBeDefined();
    expect(report.budgets['proj-1'].allocated).toBe(1000); // 50% of 2000
    expect(report.budgets['proj-1'].spent).toBe(800);
  });
});
