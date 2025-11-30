import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settlementService } from './settlementService';

// Mock Firebase App
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(() => ({ id: 'new-id' })),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
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

    toMillis() {
      return this.seconds * 1000 + this.nanoseconds / 1000000;
    }

    static fromDate(date: Date) {
      return new this(Math.floor(date.getTime() / 1000), (date.getTime() % 1000) * 1000000);
    }

    static now() {
      return this.fromDate(new Date());
    }
  },
}));

// Mock Firebase config
vi.mock('../firebase', () => ({
  db: {},
}));

// Mock dependent services
vi.mock('./projectService', () => ({
  projectService: {
    getSnapshots: vi.fn(),
    recordSnapshot: vi.fn(),
  },
}));

vi.mock('./projectTransactionService', () => ({
  projectTransactionService: {
    getProjectTransactions: vi.fn(),
  },
}));

vi.mock('./transactionService', () => ({
  transactionService: {
    getTransactions: vi.fn(),
  },
}));

import { projectService } from './projectService';

describe('settlementService - Batch', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('batchCreateSettlement', () => {
    it('should create settlements successfully', async () => {
      const settlements = [
        {
          projectId: 'p1',
          projectName: 'Project 1',
          projectIcon: '🏠',
          projectColor: '#4CAF50',
          lastSnapshot: null,
          openingBalance: 0,
          income: 500,
          expense: 200,
          closingBalance: 300,
          hasExistingSnapshot: false,
        },
        {
          projectId: 'p2',
          projectName: 'Project 2',
          projectIcon: '🚗',
          projectColor: '#2196F3',
          lastSnapshot: null,
          openingBalance: 0,
          income: 1000,
          expense: 400,
          closingBalance: 600,
          hasExistingSnapshot: false,
        },
      ];

      vi.mocked(projectService.recordSnapshot).mockResolvedValue('snapshot-id');

      const result = await settlementService.batchCreateSettlement(
        householdId,
        2023,
        10,
        settlements,
      );

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
      expect(projectService.recordSnapshot).toHaveBeenCalledTimes(2);
    });

    it('should reject when snapshots already exist', async () => {
      const settlements = [
        {
          projectId: 'p1',
          projectName: 'Project 1',
          projectIcon: '🏠',
          projectColor: '#4CAF50',
          lastSnapshot: null,
          openingBalance: 0,
          income: 500,
          expense: 200,
          closingBalance: 300,
          hasExistingSnapshot: true, // Already has snapshot
        },
      ];

      const result = await settlementService.batchCreateSettlement(
        householdId,
        2023,
        10,
        settlements,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('already have snapshots');
      expect(projectService.recordSnapshot).not.toHaveBeenCalled();
    });

    it('should handle creation errors gracefully', async () => {
      const settlements = [
        {
          projectId: 'p1',
          projectName: 'Project 1',
          projectIcon: '🏠',
          projectColor: '#4CAF50',
          lastSnapshot: null,
          openingBalance: 0,
          income: 500,
          expense: 200,
          closingBalance: 300,
          hasExistingSnapshot: false,
        },
      ];

      vi.mocked(projectService.recordSnapshot).mockRejectedValue(new Error('Firestore error'));

      const result = await settlementService.batchCreateSettlement(
        householdId,
        2023,
        10,
        settlements,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to create settlements');
    });
  });
});
