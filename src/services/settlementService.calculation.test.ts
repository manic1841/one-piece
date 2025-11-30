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
import { projectTransactionService } from './projectTransactionService';
import { transactionService } from './transactionService';

describe('settlementService - Calculation', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateMonthlySettlement', () => {
    beforeEach(() => {
      // Default mocks
      vi.mocked(projectService.getSnapshots).mockResolvedValue([]);
      vi.mocked(projectTransactionService.getProjectTransactions).mockResolvedValue([]);
      vi.mocked(transactionService.getTransactions).mockResolvedValue([]);
    });

    it('should calculate settlement with previous snapshot', async () => {
      const prevSnapshot = {
        id: 'prev-snapshot',
        year: 2023,
        month: 9,
        openingBalance: 500,
        income: 600,
        expense: 100,
        closingBalance: 1000,
        createdAt: Timestamp.now(),
      };

      // Mock snapshots: empty for current month, previous month has snapshot
      vi.mocked(projectService.getSnapshots)
        .mockResolvedValueOnce([]) // Current month check
        .mockResolvedValueOnce([prevSnapshot]); // Previous month

      const currentMonth = new Date('2023-10-15');
      const projectTransactions = [
        {
          id: 'pt-1',
          type: 'transfer' as const,
          fromProject: 'project-0',
          toProject: 'project-1',
          amount: 300,
          date: Timestamp.fromDate(currentMonth),
          description: 'Transfer',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
        },
      ];

      const transactions = [
        {
          id: 't-1',
          projectId: 'project-1',
          type: 'income' as const,
          amount: 200,
          category: 'salary',
          date: Timestamp.fromDate(currentMonth),
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
          householdId,
        },
        {
          id: 't-2',
          projectId: 'project-1',
          type: 'expense' as const,
          amount: 150,
          category: 'food',
          date: Timestamp.fromDate(currentMonth),
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
          householdId,
        },
      ];

      vi.mocked(projectTransactionService.getProjectTransactions).mockResolvedValue(
        projectTransactions,
      );
      vi.mocked(transactionService.getTransactions).mockResolvedValue(transactions);

      const result = await settlementService.calculateMonthlySettlement(
        householdId,
        'project-1',
        'Test Project',
        '💰',
        '#4CAF50',
        2023,
        10,
      );

      expect(result).toEqual({
        projectId: 'project-1',
        projectName: 'Test Project',
        projectIcon: '💰',
        projectColor: '#4CAF50',
        lastSnapshot: {
          year: 2023,
          month: 9,
          balance: 1000,
        },
        openingBalance: 1000,
        income: 500, // 300 from project transaction + 200 from income transaction
        expense: 150,
        closingBalance: 1350, // 1000 + 500 - 150
        hasExistingSnapshot: false,
      });
    });

    it('should calculate settlement without previous snapshot', async () => {
      vi.mocked(projectService.getSnapshots).mockResolvedValue([]);

      const result = await settlementService.calculateMonthlySettlement(
        householdId,
        'project-1',
        'New Project',
        '🎯',
        '#2196F3',
        2023,
        10,
      );

      expect(result.openingBalance).toBe(0);
      expect(result.lastSnapshot).toBe(null);
    });

    it('should handle year boundary (January uses December of previous year)', async () => {
      const decSnapshot = {
        id: 'dec-snapshot',
        year: 2022,
        month: 12,
        openingBalance: 800,
        income: 300,
        expense: 100,
        closingBalance: 1000,
        createdAt: Timestamp.now(),
      };

      vi.mocked(projectService.getSnapshots)
        .mockResolvedValueOnce([]) // Current month (Jan 2023) check
        .mockResolvedValueOnce([decSnapshot]); // Previous month (Dec 2022)

      const result = await settlementService.calculateMonthlySettlement(
        householdId,
        'project-1',
        'Year Boundary',
        '📅',
        '#FF9800',
        2023,
        1,
      );

      expect(result.openingBalance).toBe(1000);
      expect(result.lastSnapshot?.year).toBe(2022);
      expect(result.lastSnapshot?.month).toBe(12);
    });

    it('should handle Date objects in transactions', async () => {
      vi.mocked(projectService.getSnapshots).mockResolvedValue([]);

      const currentMonth = new Date('2023-10-15');
      const transactions = [
        {
          id: 't-1',
          projectId: 'project-1',
          type: 'income' as const,
          amount: 100,
          category: 'salary',
          date: currentMonth, // Date object instead of Timestamp
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
          householdId,
        },
      ];

      vi.mocked(transactionService.getTransactions).mockResolvedValue(transactions);

      const result = await settlementService.calculateMonthlySettlement(
        householdId,
        'project-1',
        'Test',
        '💵',
        '#4CAF50',
        2023,
        10,
      );

      expect(result.income).toBe(100);
    });
  });

  describe('calculateAllSettlements', () => {
    it('should calculate settlements for multiple projects', async () => {
      vi.mocked(projectService.getSnapshots).mockResolvedValue([]);
      vi.mocked(projectTransactionService.getProjectTransactions).mockResolvedValue([]);
      vi.mocked(transactionService.getTransactions).mockResolvedValue([]);

      const projects = [
        { id: 'p1', name: 'Project 1', icon: '🏠', color: '#4CAF50' },
        { id: 'p2', name: 'Project 2', icon: '🚗', color: '#2196F3' },
      ];

      const results = await settlementService.calculateAllSettlements(
        householdId,
        projects,
        2023,
        10,
      );

      expect(results).toHaveLength(2);
      expect(results[0].projectId).toBe('p1');
      expect(results[1].projectId).toBe('p2');
    });
  });
});
