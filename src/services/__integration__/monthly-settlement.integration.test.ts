import { Timestamp } from 'firebase/firestore';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { settlementService } from '../settlementService';

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

// In-memory DB mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb: Record<string, any> = {};

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
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
    getDocs: vi.fn(async (query) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const collectionPath = (query as any).path;
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
    serverTimestamp: vi.fn(() => 'mock-timestamp'),
    runTransaction: vi.fn(async (db, callback) => {
      const transaction = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get: async (ref: any) => ({
          exists: () => !!mockDb[ref.path],
          data: () => mockDb[ref.path],
          id: ref.id,
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set: (ref: any, data: any) => {
          mockDb[ref.path] = data;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        update: (ref: any, data: any) => {
          mockDb[ref.path] = { ...mockDb[ref.path], ...data };
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete: (ref: any) => {
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

describe('Monthly Settlement Integration Flow', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in mockDb) delete mockDb[key];
  });

  it('should calculate settlement and update project snapshots', async () => {
    // 1. Setup Initial State
    // Create a project
    const projectId = 'proj-1';
    mockDb[`households/${householdId}/projects/${projectId}`] = {
      id: projectId,
      name: 'Test Project',
      currentBalance: 1000,
      isActive: true,
    };

    // Create an account
    const accountId = 'acc-1';
    mockDb[`households/${householdId}/accounts/${accountId}`] = {
      id: accountId,
      name: 'Test Account',
      balance: 2000,
      type: 'checking',
    };

    // Create some transactions for the month
    const tx1Id = 'tx-1';
    mockDb[`households/${householdId}/projectTransactions/${tx1Id}`] = {
      id: tx1Id,
      amount: 500,
      type: 'income',
      toProject: projectId,
      date: Timestamp.fromDate(new Date('2023-10-15')),
      incomeSource: 'inc-1',
    };

    const tx2Id = 'tx-2';
    mockDb[`households/${householdId}/projectTransactions/${tx2Id}`] = {
      id: tx2Id,
      amount: 200,
      type: 'expense',
      fromProject: projectId,
      date: Timestamp.fromDate(new Date('2023-10-20')),
    };

    // 2. Run Settlement
    const month = '2023-10';

    const settlementData = [
      {
        projectId,
        projectName: 'Test Project',
        projectIcon: 'icon',
        projectColor: 'blue',
        lastSnapshot: null,
        openingBalance: 1000,
        income: 500,
        expense: 200,
        closingBalance: 1300,
        hasExistingSnapshot: false,
      },
    ];

    const [yearStr, monthStr] = month.split('-');
    const yearNum = parseInt(yearStr);
    const monthNum = parseInt(monthStr);

    await settlementService.batchCreateSettlement(householdId, yearNum, monthNum, settlementData);

    // 3. Verify Snapshots Created
    const dbKeys = Object.keys(mockDb);
    const snapshotKeys = dbKeys.filter((k) => k.includes('snapshots'));

    expect(snapshotKeys.length).toBeGreaterThan(0);

    // Verify project balance updated
    const snapshotDoc = mockDb[snapshotKeys[0]];
    expect(snapshotDoc.month).toBe(monthNum);
    expect(snapshotDoc.closingBalance).toBe(1300);
  });
});
