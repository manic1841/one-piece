import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settlementService } from './settlementService';
import { Timestamp } from 'firebase/firestore';

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

describe('settlementService - Basic', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkExistingSnapshot', () => {
    it('should return true when snapshot exists', async () => {
      vi.mocked(projectService.getSnapshots).mockResolvedValue([
        {
          id: 'snapshot-1',
          year: 2023,
          month: 10,
          openingBalance: 1000,
          income: 500,
          expense: 200,
          closingBalance: 1300,
          createdAt: Timestamp.now(),
        },
      ]);

      const result = await settlementService.checkExistingSnapshot(
        householdId,
        'project-1',
        2023,
        10,
      );

      expect(result).toBe(true);
      expect(projectService.getSnapshots).toHaveBeenCalledWith(householdId, 'project-1', 2023, 10);
    });

    it('should return false when no snapshot exists', async () => {
      vi.mocked(projectService.getSnapshots).mockResolvedValue([]);

      const result = await settlementService.checkExistingSnapshot(
        householdId,
        'project-1',
        2023,
        10,
      );

      expect(result).toBe(false);
    });
  });

  describe('getLatestSnapshot', () => {
    it('should return the latest snapshot when exists', async () => {
      const mockSnapshot = {
        id: 'snapshot-1',
        year: 2023,
        month: 10,
        openingBalance: 1000,
        income: 500,
        expense: 200,
        closingBalance: 1300,
        createdAt: Timestamp.now(),
      };

      vi.mocked(projectService.getSnapshots).mockResolvedValue([mockSnapshot]);

      const result = await settlementService.getLatestSnapshot(householdId, 'project-1');

      expect(result).toEqual(mockSnapshot);
      expect(projectService.getSnapshots).toHaveBeenCalledWith(householdId, 'project-1');
    });

    it('should return null when no snapshot exists', async () => {
      vi.mocked(projectService.getSnapshots).mockResolvedValue([]);

      const result = await settlementService.getLatestSnapshot(householdId, 'project-1');

      expect(result).toBe(null);
    });
  });
});
