import { Timestamp } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { plannedIncomeService } from '../plannedIncomeService';

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

// We need a more sophisticated Firestore mock to handle writes and reads across services
// For this integration test, we'll simulate a simple in-memory DB
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb: Record<string, any> = {};

vi.mock('firebase/firestore', () => {
  const actual = vi.importActual('firebase/firestore');
  return {
    ...actual,
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
      // Handle db, path case
      const path = pathSegments.join('/');
      return { id: pathSegments[pathSegments.length - 1], path };
    }),
    setDoc: vi.fn(async (ref, data) => {
      mockDb[ref.path] = data;
    }),
    updateDoc: vi.fn(async (ref, data) => {
      mockDb[ref.path] = { ...mockDb[ref.path], ...data };
    }),
    deleteDoc: vi.fn(async (ref) => {
      delete mockDb[ref.path];
    }),
    getDoc: vi.fn(async (ref) => ({
      exists: () => !!mockDb[ref.path],
      data: () => mockDb[ref.path],
      id: ref.id,
    })),
    getDocs: vi.fn(async () => {
      return {
        empty: true,
        docs: [],
        size: 0,
      };
    }),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    serverTimestamp: vi.fn(() => 'mock-timestamp'),
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

describe('Income Allocation Integration Flow', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear in-memory DB
    for (const key in mockDb) delete mockDb[key];
  });

  it('should create project transactions when planned income is created', async () => {
    const plannedIncomeData = {
      category: 'salary' as const,
      amount: 10000,
      date: Timestamp.fromDate(new Date('2023-11-01')),
      allocations: [
        { projectId: 'proj-A', percentage: 60 },
        { projectId: 'proj-B', percentage: 40 },
      ],
      createdBy: 'user-1',
    };

    // 1. Create Planned Income
    const plannedIncomeId = await plannedIncomeService.createPlannedIncome(
      householdId,
      plannedIncomeData,
      '',
    );

    // 2. Verify Planned Income in DB
    // Let's verify that mockDb contains the expected project transactions.
    const dbKeys = Object.keys(mockDb);
    const transactionKeys = dbKeys.filter((k) => k.includes('projectTransactions'));

    expect(transactionKeys).toHaveLength(2);

    const t1 = mockDb[transactionKeys[0]];
    const t2 = mockDb[transactionKeys[1]];

    // Verify amounts
    const amounts = [t1.amount, t2.amount].sort((a, b) => b - a);
    expect(amounts[0]).toBe(6000); // 60% of 10000
    expect(amounts[1]).toBe(4000); // 40% of 10000

    // Verify incomeSource linkage
    expect(t1.incomeSource).toBe(plannedIncomeId);
    expect(t2.incomeSource).toBe(plannedIncomeId);
  });
});
