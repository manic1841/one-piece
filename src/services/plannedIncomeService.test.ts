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
  updateDoc: vi.fn(),
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

vi.mock('../repositories/plannedIncomeRepository', () => ({
  plannedIncomeRepository: {
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getDocRefForTransaction: vi.fn(() => ({ id: 'new-income-id' })),
  },
}));

import { runTransaction } from 'firebase/firestore';
import { projectTransactionService } from './projectTransactionService';
import { plannedIncomeRepository } from '../repositories/plannedIncomeRepository';

describe('plannedIncomeService', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPlannedIncome', () => {
    it('should create planned income and return id', async () => {
      const mockData = {
        category: 'salary' as const,
        amount: 5000,
        date: Timestamp.fromDate(new Date('2023-10-15')),
        allocations: [],
        createdBy: 'user-1',
      };

      const result = await plannedIncomeService.createPlannedIncome(householdId, mockData);

      expect(result).toBe('new-income-id');
      expect(runTransaction).toHaveBeenCalled();
    });

    it('should create project transactions for allocations', async () => {
      const mockData = {
        category: 'salary' as const,
        amount: 5000,
        date: Timestamp.fromDate(new Date('2023-10-15')),
        allocations: [
          { projectId: 'proj-1', percentage: 50 },
          { projectId: 'proj-2', percentage: 50 },
        ],
        createdBy: 'user-1',
      };

      await plannedIncomeService.createPlannedIncome(householdId, mockData);

      expect(projectTransactionService.createProjectTransaction).toHaveBeenCalledTimes(2);
      expect(projectTransactionService.createProjectTransaction).toHaveBeenCalledWith(
        householdId,
        expect.objectContaining({
          toProject: 'proj-1',
          amount: 2500,
          type: 'allocation',
        }),
        expect.anything(),
      );
    });

    it('should not create transaction for 0% allocation', async () => {
      const mockData = {
        category: 'salary' as const,
        amount: 5000,
        date: Timestamp.fromDate(new Date('2023-10-15')),
        allocations: [
          { projectId: 'proj-1', percentage: 100 },
          { projectId: 'proj-2', percentage: 0 },
        ],
        createdBy: 'user-1',
      };

      await plannedIncomeService.createPlannedIncome(householdId, mockData);

      expect(projectTransactionService.createProjectTransaction).toHaveBeenCalledTimes(1);
      expect(projectTransactionService.createProjectTransaction).toHaveBeenCalledWith(
        householdId,
        expect.objectContaining({
          toProject: 'proj-1',
        }),
        expect.anything(),
      );
    });
  });

  describe('updatePlannedIncome', () => {
    it('should update planned income without allocations directly', async () => {
      const updateData = {
        amount: 6000,
      };

      await plannedIncomeService.updatePlannedIncome(householdId, 'income-1', updateData);

      // Since we didn't provide allocations, it goes to the repository update
      expect(plannedIncomeRepository.update).toHaveBeenCalledWith(
        householdId,
        'income-1',
        updateData,
      );
    });

    it('should handle updates with allocations via transaction', async () => {
      const updateData = {
        amount: 6000,
        allocations: [{ projectId: 'proj-1', percentage: 100 }],
      };

      // Mock the transaction.get to return existing document
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            id: 'income-1',
            category: 'salary',
            amount: 5000,
            date: Timestamp.fromDate(new Date('2023-10-15')),
            allocations: [],
            createdBy: 'user-1',
            createdAt: Timestamp.now(),
          }),
        }),
        update: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      };

      vi.mocked(runTransaction).mockImplementation(async (db, callback) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return callback(mockTransaction as any);
      });

      // Mock existing transactions
      vi.mocked(projectTransactionService.getProjectTransactionsByIncomeSource).mockResolvedValue([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: 'trans-1' } as any,
      ]);

      await plannedIncomeService.updatePlannedIncome(householdId, 'income-1', updateData);

      // Verify steps
      // 1. Get existing doc
      expect(mockTransaction.get).toHaveBeenCalled();

      // 2. Delete old transactions
      expect(projectTransactionService.deleteProjectTransactions).toHaveBeenCalledWith(
        householdId,
        ['trans-1'],
        mockTransaction,
      );

      // 3. Create new transactions
      expect(projectTransactionService.createProjectTransaction).toHaveBeenCalledWith(
        householdId,
        expect.objectContaining({
          amount: 6000, // 100% of new amount
          toProject: 'proj-1',
        }),
        mockTransaction,
      );

      // 4. Update doc
      expect(mockTransaction.update).toHaveBeenCalled();
    });

    it('should throw error if planned income not found during update with allocations', async () => {
      const updateData = {
        allocations: [],
      };

      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => false,
        }),
      };

      vi.mocked(runTransaction).mockImplementation(async (db, callback) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return callback(mockTransaction as any);
      });

      await expect(
        plannedIncomeService.updatePlannedIncome(householdId, 'income-1', updateData),
      ).rejects.toThrow('Planned income not found');
    });
  });

  describe('deletePlannedIncome', () => {
    it('should delete planned income and related transactions', async () => {
      const mockTransaction = {
        delete: vi.fn(),
      };

      vi.mocked(runTransaction).mockImplementation(async (db, callback) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return callback(mockTransaction as any);
      });

      vi.mocked(projectTransactionService.getProjectTransactionsByIncomeSource).mockResolvedValue([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: 'trans-1' } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: 'trans-2' } as any,
      ]);

      await plannedIncomeService.deletePlannedIncome(householdId, 'income-1');

      expect(projectTransactionService.deleteProjectTransactions).toHaveBeenCalledWith(
        householdId,
        ['trans-1', 'trans-2'],
        mockTransaction,
      );

      expect(mockTransaction.delete).toHaveBeenCalled();
    });
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

      vi.mocked(plannedIncomeRepository.getAll).mockResolvedValue(mockIncomes);

      const result = await plannedIncomeService.getPlannedIncomes(householdId);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no incomes exist', async () => {
      vi.mocked(plannedIncomeRepository.getAll).mockResolvedValue([]);

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

      vi.mocked(plannedIncomeRepository.getAll).mockResolvedValue([mockIncome]);

      const result = await plannedIncomeService.getLatestPlannedIncomeByCategory(
        householdId,
        'salary',
      );

      expect(result).toBeTruthy();
      expect(result?.category).toBe('salary');
    });

    it('should return null when no income exists for category', async () => {
      vi.mocked(plannedIncomeRepository.getAll).mockResolvedValue([]);

      const result = await plannedIncomeService.getLatestPlannedIncomeByCategory(
        householdId,
        'unknown-category',
      );

      expect(result).toBe(null);
    });
  });
});
