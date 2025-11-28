import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectTransactionService } from './projectTransactionService';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: 'new-transaction-id' })),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
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

vi.mock('../firebase', () => ({
  db: {},
}));

import { getDocs } from 'firebase/firestore';

describe('projectTransactionService', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProjectTransactions', () => {
    it('should return all project transactions', async () => {
      const mockTransactions = [
        {
          id: 'pt-1',
          type: 'transfer' as const,
          fromProject: 'proj-1',
          toProject: 'proj-2',
          amount: 500,
          date: Timestamp.fromDate(new Date('2023-10-15')),
          description: 'Transfer',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
        },
        {
          id: 'pt-2',
          type: 'allocation' as const,
          toProject: 'proj-1',
          amount: 1000,
          date: Timestamp.fromDate(new Date('2023-10-10')),
          incomeSource: 'income-1',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockTransactions.map((t) => ({
          id: t.id,
          data: () => t,
        })),
        empty: false,
        size: mockTransactions.length,
      } as never);

      const result = await projectTransactionService.getProjectTransactions(householdId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pt-1');
      expect(result[1].id).toBe('pt-2');
    });

    it('should filter by project ID', async () => {
      const mockTransactions = [
        {
          id: 'pt-1',
          type: 'transfer' as const,
          fromProject: 'proj-1',
          toProject: 'proj-2',
          amount: 500,
          date: Timestamp.fromDate(new Date('2023-10-15')),
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockTransactions.map((t) => ({
          id: t.id,
          data: () => t,
        })),
        empty: false,
        size: mockTransactions.length,
      } as never);

      const result = await projectTransactionService.getProjectTransactions(householdId, {
        projectId: 'proj-2',
      });

      expect(result).toHaveLength(1);
      expect(result[0].toProject).toBe('proj-2');
    });

    it('should filter by date range', async () => {
      const mockTransactions = [
        {
          id: 'pt-1',
          type: 'transfer' as const,
          fromProject: 'proj-1',
          toProject: 'proj-2',
          amount: 500,
          date: Timestamp.fromDate(new Date('2023-10-15')),
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockTransactions.map((t) => ({
          id: t.id,
          data: () => t,
        })),
        empty: false,
        size: mockTransactions.length,
      } as never);

      const result = await projectTransactionService.getProjectTransactions(householdId, {
        startDate: '2023-10-01',
        endDate: '2023-10-31',
      });

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no transactions exist', async () => {
      vi.mocked(getDocs).mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
      } as never);

      const result = await projectTransactionService.getProjectTransactions(householdId);

      expect(result).toEqual([]);
    });
  });

  describe('getProjectTransactionsByIncomeSource', () => {
    it('should return transactions for specific income source', async () => {
      const mockTransactions = [
        {
          id: 'pt-1',
          type: 'allocation' as const,
          toProject: 'proj-1',
          amount: 1000,
          date: Timestamp.fromDate(new Date('2023-10-10')),
          incomeSource: 'income-1',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
        },
        {
          id: 'pt-2',
          type: 'allocation' as const,
          toProject: 'proj-2',
          amount: 500,
          date: Timestamp.fromDate(new Date('2023-10-10')),
          incomeSource: 'income-1',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockTransactions.map((t) => ({
          id: t.id,
          data: () => t,
        })),
        empty: false,
        size: mockTransactions.length,
      } as never);

      const result = await projectTransactionService.getProjectTransactionsByIncomeSource(
        householdId,
        'income-1',
      );

      expect(result).toHaveLength(2);
      expect(result.every((t) => t.incomeSource === 'income-1')).toBe(true);
    });

    it('should return empty array when no matching transactions', async () => {
      vi.mocked(getDocs).mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
      } as never);

      const result = await projectTransactionService.getProjectTransactionsByIncomeSource(
        householdId,
        'income-999',
      );

      expect(result).toEqual([]);
    });
  });
});
