import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transactionService } from './transactionService';
import { Timestamp, QuerySnapshot } from 'firebase/firestore';

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

import { setDoc, getDocs } from 'firebase/firestore';

describe('transactionService', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTransaction', () => {
    it('should call setDoc with correct data', async () => {
      const transactionData = {
        amount: 100,
        type: 'expense' as const,
        category: 'food',
        date: new Date('2023-10-01'),
        description: 'Lunch',
        projectId: 'project-1',
        allocations: [],
        createdBy: 'user-1',
      };

      const result = await transactionService.createTransaction(householdId, transactionData);

      expect(setDoc).toHaveBeenCalled();
      expect(result).toBe('new-id');
    });
  });

  describe('getTransactions', () => {
    it('should return filtered transactions', async () => {
      const mockTransactions = [
        {
          id: '1',
          amount: 100,
          type: 'expense',
          category: 'food',
          date: Timestamp.fromDate(new Date('2023-10-01')),
          projectId: 'p1',
          createdBy: 'u1',
          createdAt: Timestamp.now(),
          householdId,
        },
        {
          id: '2',
          amount: 200,
          type: 'income',
          category: 'salary',
          date: Timestamp.fromDate(new Date('2023-10-02')),
          projectId: 'p1',
          createdBy: 'u1',
          createdAt: Timestamp.now(),
          householdId,
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockTransactions.map((t) => ({
          id: t.id,
          data: () => t,
        })),
      } as unknown as QuerySnapshot);

      // Test filtering by type
      const expenses = await transactionService.getTransactions(householdId, { type: 'expense' });
      expect(expenses).toHaveLength(1);
      expect(expenses[0].id).toBe('1');

      // Test filtering by date
      const dateFiltered = await transactionService.getTransactions(householdId, {
        startDate: '2023-10-02',
      });
      expect(dateFiltered).toHaveLength(1);
      expect(dateFiltered[0].id).toBe('2');
    });
  });

  describe('getTransactionStats', () => {
    it('should calculate stats correctly', async () => {
      const mockTransactions = [
        {
          id: '1',
          amount: 100,
          type: 'expense',
          category: 'food',
          date: Timestamp.fromDate(new Date('2023-10-01')),
          projectId: 'p1',
          createdBy: 'u1',
          createdAt: Timestamp.now(),
          householdId,
        },
        {
          id: '2',
          amount: 500,
          type: 'income',
          category: 'salary',
          date: Timestamp.fromDate(new Date('2023-10-02')),
          projectId: 'p1',
          createdBy: 'u1',
          createdAt: Timestamp.now(),
          householdId,
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockTransactions.map((t) => ({
          id: t.id,
          data: () => t,
        })),
      } as unknown as QuerySnapshot);

      const stats = await transactionService.getTransactionStats(householdId);

      expect(stats.totalIncome).toBe(500);
      expect(stats.totalExpense).toBe(100);
      expect(stats.balance).toBe(400);
    });
  });
});
