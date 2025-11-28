import { describe, it, expect, vi, beforeEach } from 'vitest';
import { plannedIncomeService } from './plannedIncomeService';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: 'new-income-id' })),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
  runTransaction: vi.fn((db, callback) =>
    callback({
      set: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }),
  ),
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

vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('./projectTransactionService', () => ({
  projectTransactionService: {
    createProjectTransaction: vi.fn(),
    getProjectTransactionsByIncomeSource: vi.fn(),
    deleteProjectTransactions: vi.fn(),
  },
}));

import { getDocs } from 'firebase/firestore';

describe('plannedIncomeService', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPlannedIncomes', () => {
    it('should return planned incomes sorted by date', async () => {
      const mockIncomes = [
        {
          id: 'income-1',
          category: 'salary',
          amount: 50000,
          date: Timestamp.fromDate(new Date('2023-10-15')),
          allocations: [],
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
        },
        {
          id: 'income-2',
          category: 'bonus',
          amount: 10000,
          date: Timestamp.fromDate(new Date('2023-10-10')),
          allocations: [],
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockIncomes.map((i) => ({
          id: i.id,
          data: () => i,
        })),
        empty: false,
        size: mockIncomes.length,
      } as never);

      const result = await plannedIncomeService.getPlannedIncomes(householdId);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no incomes exist', async () => {
      vi.mocked(getDocs).mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
      } as never);

      const result = await plannedIncomeService.getPlannedIncomes(householdId);

      expect(result).toEqual([]);
    });
  });

  describe('getLatestPlannedIncomeByCategory', () => {
    it('should return latest income for specific category', async () => {
      const mockIncome = {
        id: 'income-1',
        category: 'salary',
        amount: 50000,
        date: Timestamp.fromDate(new Date('2023-10-15')),
        allocations: [],
        createdBy: 'user-1',
        createdAt: Timestamp.now(),
      };

      vi.mocked(getDocs).mockResolvedValue({
        docs: [
          {
            id: mockIncome.id,
            data: () => mockIncome,
          },
        ],
        empty: false,
        size: 1,
      } as never);

      const result = await plannedIncomeService.getLatestPlannedIncomeByCategory(
        householdId,
        'salary',
      );

      expect(result).toBeTruthy();
      expect(result?.category).toBe('salary');
    });

    it('should return null when no income exists for category', async () => {
      vi.mocked(getDocs).mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
      } as never);

      const result = await plannedIncomeService.getLatestPlannedIncomeByCategory(
        householdId,
        'unknown-category',
      );

      expect(result).toBe(null);
    });
  });
});
