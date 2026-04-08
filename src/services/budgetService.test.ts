import { describe, it, expect, vi, beforeEach } from 'vitest';
import { budgetService } from './budgetService';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase App
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: 'household-1' })),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
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
    getProjects: vi.fn(),
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

import { getDoc, updateDoc } from 'firebase/firestore';
import { projectService } from './projectService';
import { projectTransactionService } from './projectTransactionService';
import { transactionService } from './transactionService';

describe('budgetService', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBudgetAllocations', () => {
    it('should return default allocations when household has no budget data', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => undefined,
      } as never);

      const result = await budgetService.getBudgetAllocations(householdId);

      expect(result).toEqual({
        salary: { savings: 100 },
        bonus: { savings: 100 },
        investment: { savings: 100 },
        other: { savings: 100 },
      });
    });

    it('should return stored allocations when they exist', async () => {
      const customAllocations = {
        salary: { 'project-1': 50, savings: 50 },
        bonus: { 'project-2': 30, savings: 70 },
        investment: { savings: 100 },
        other: { savings: 100 },
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ budgetAllocations: customAllocations }),
      } as never);

      const result = await budgetService.getBudgetAllocations(householdId);

      expect(result).toEqual(customAllocations);
    });

    it('should return default allocations when budgetAllocations field is missing', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ name: 'Test Household' }),
      } as never);

      const result = await budgetService.getBudgetAllocations(householdId);

      expect(result).toEqual({
        salary: { savings: 100 },
        bonus: { savings: 100 },
        investment: { savings: 100 },
        other: { savings: 100 },
      });
    });
  });

  describe('updateBudgetAllocations', () => {
    it('should update budget allocations when they sum to 100%', async () => {
      const validAllocations = {
        salary: { 'project-1': 60, 'project-2': 40 },
        bonus: { savings: 100 },
        investment: { 'project-1': 50, savings: 50 },
        other: { savings: 100 },
      };

      await budgetService.updateBudgetAllocations(householdId, validAllocations);

      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
        budgetAllocations: validAllocations,
      });
    });

    it('should throw error when allocations do not sum to 100%', async () => {
      const invalidAllocations = {
        salary: { 'project-1': 60, 'project-2': 30 }, // Only 90%
        bonus: { savings: 100 },
        investment: { savings: 100 },
        other: { savings: 100 },
      };

      await expect(
        budgetService.updateBudgetAllocations(householdId, invalidAllocations),
      ).rejects.toThrow('Budget allocations for salary must sum to 100% (currently 90.0%)');

      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should throw error when allocations exceed 100%', async () => {
      const invalidAllocations = {
        salary: { 'project-1': 60, 'project-2': 50 }, // 110%
        bonus: { savings: 100 },
        investment: { savings: 100 },
        other: { savings: 100 },
      };

      await expect(
        budgetService.updateBudgetAllocations(householdId, invalidAllocations),
      ).rejects.toThrow('Budget allocations for salary must sum to 100% (currently 110.0%)');
    });

    it('should accept allocations within tolerance (100% ± 0.01)', async () => {
      const validAllocations = {
        salary: { 'project-1': 60.005, 'project-2': 39.995 }, // 100.0% within tolerance
        bonus: { savings: 100 },
        investment: { savings: 100 },
        other: { savings: 100 },
      };

      await budgetService.updateBudgetAllocations(householdId, validAllocations);

      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('calculateMonthlyBudget', () => {
    beforeEach(() => {
      vi.mocked(projectService.getProjects).mockResolvedValue([]);
      vi.mocked(projectTransactionService.getProjectTransactions).mockResolvedValue([]);
      vi.mocked(transactionService.getTransactions).mockResolvedValue([]);
    });

    it('should calculate monthly budget with income and expenses', async () => {
      const projects = [
        { id: 'proj-1', name: 'Housing', icon: '🏠', color: '#4CAF50' },
        { id: 'proj-2', name: 'Transport', icon: '🚗', color: '#2196F3' },
      ];
      vi.mocked(projectService.getProjects).mockResolvedValue(projects);

      const projectTransactions = [
        {
          id: 'pt-1',
          fromProject: 'savings',
          toProject: 'proj-1',
          amount: 1000,
          date: Timestamp.fromDate(new Date('2023-10-15')),
          description: 'Housing budget',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
          householdId,
        },
        {
          id: 'pt-2',
          fromProject: 'savings',
          toProject: 'proj-2',
          amount: 500,
          date: Timestamp.fromDate(new Date('2023-10-15')),
          description: 'Transport budget',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
          householdId,
        },
      ];

      const incomeTransactions = [
        {
          id: 'it-1',
          type: 'income' as const,
          category: 'salary',
          amount: 3000,
          date: Timestamp.fromDate(new Date('2023-10-01')),
          projectId: 'savings',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
          householdId,
        },
        {
          id: 'it-2',
          type: 'income' as const,
          category: 'bonus',
          amount: 500,
          date: Timestamp.fromDate(new Date('2023-10-15')),
          projectId: 'savings',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
          householdId,
        },
      ];

      const expenseTransactions = [
        {
          id: 'et-1',
          type: 'expense' as const,
          category: 'rent',
          amount: 800,
          date: Timestamp.fromDate(new Date('2023-10-05')),
          projectId: 'proj-1',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
          householdId,
        },
        {
          id: 'et-2',
          type: 'expense' as const,
          category: 'fuel',
          amount: 200,
          date: Timestamp.fromDate(new Date('2023-10-10')),
          projectId: 'proj-2',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
          householdId,
        },
      ];

      vi.mocked(projectTransactionService.getProjectTransactions).mockResolvedValue(
        projectTransactions,
      );
      vi.mocked(transactionService.getTransactions)
        .mockResolvedValueOnce(expenseTransactions) // First call: expenses
        .mockResolvedValueOnce(incomeTransactions); // Second call: income

      const result = await budgetService.calculateMonthlyBudget(householdId, 2023, 10);

      expect(result.householdId).toBe(householdId);
      expect(result.year).toBe(2023);
      expect(result.month).toBe(10);
      expect(result.totalIncome).toBe(3500);
      expect(result.incomeBreakdown).toEqual({
        salary: 3000,
        bonus: 500,
        investment: 0,
        other: 0,
      });
      expect(result.budgets['proj-1']).toEqual({
        allocated: 1000,
        spent: 800,
      });
      expect(result.budgets['proj-2']).toEqual({
        allocated: 500,
        spent: 200,
      });
    });

    it('should handle projects with no transactions', async () => {
      const projects = [{ id: 'proj-1', name: 'New Project', icon: '🎯', color: '#4CAF50' }];
      vi.mocked(projectService.getProjects).mockResolvedValue(projects);

      const result = await budgetService.calculateMonthlyBudget(householdId, 2023, 10);

      expect(result.budgets['proj-1']).toEqual({
        allocated: 0,
        spent: 0,
      });
    });

    it('should categorize unknown income as "other"', async () => {
      const incomeTransactions = [
        {
          id: 'it-1',
          type: 'income' as const,
          category: 'unknown-category',
          amount: 100,
          date: Timestamp.fromDate(new Date('2023-10-01')),
          projectId: 'savings',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
          householdId,
        },
      ];

      vi.mocked(transactionService.getTransactions)
        .mockResolvedValueOnce([]) // Expenses
        .mockResolvedValueOnce(incomeTransactions); // Income

      const result = await budgetService.calculateMonthlyBudget(householdId, 2023, 10);

      expect(result.incomeBreakdown.other).toBe(100);
      expect(result.totalIncome).toBe(100);
    });
  });

  describe('getMonthlyStats', () => {
    it('should calculate statistics correctly', async () => {
      const projects = [{ id: 'proj-1', name: 'Housing', icon: '🏠', color: '#4CAF50' }];
      vi.mocked(projectService.getProjects).mockResolvedValue(projects);

      const projectTransactions = [
        {
          id: 'pt-1',
          fromProject: 'savings',
          toProject: 'proj-1',
          amount: 1000,
          date: Timestamp.fromDate(new Date('2023-10-15')),
          description: 'Housing budget',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
          householdId,
        },
      ];

      const incomeTransactions = [
        {
          id: 'it-1',
          type: 'income' as const,
          category: 'salary',
          amount: 2000,
          date: Timestamp.fromDate(new Date('2023-10-01')),
          projectId: 'savings',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
          householdId,
        },
      ];

      const expenseTransactions = [
        {
          id: 'et-1',
          type: 'expense' as const,
          category: 'rent',
          amount: 800,
          date: Timestamp.fromDate(new Date('2023-10-05')),
          projectId: 'proj-1',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
          householdId,
        },
      ];

      vi.mocked(projectTransactionService.getProjectTransactions).mockResolvedValue(
        projectTransactions,
      );
      vi.mocked(transactionService.getTransactions)
        .mockResolvedValueOnce(expenseTransactions)
        .mockResolvedValueOnce(incomeTransactions);

      const result = await budgetService.getMonthlyStats(householdId, 2023, 10);

      expect(result.totalIncome).toBe(2000);
      expect(result.stats).toHaveLength(1);
      expect(result.stats[0]).toEqual({
        category: 'proj-1',
        percentage: 50, // 1000 / 2000 * 100
        allocated: 1000,
        spent: 800,
        remaining: 200,
        percentageUsed: 80, // 800 / 1000 * 100
        isOverBudget: false,
      });
    });

    it('should detect over-budget projects', async () => {
      const projects = [{ id: 'proj-1', name: 'Housing', icon: '🏠', color: '#4CAF50' }];
      vi.mocked(projectService.getProjects).mockResolvedValue(projects);

      const projectTransactions = [
        {
          id: 'pt-1',
          fromProject: 'savings',
          toProject: 'proj-1',
          amount: 1000,
          date: Timestamp.fromDate(new Date('2023-10-15')),
          description: 'Housing budget',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
          householdId,
        },
      ];

      const expenseTransactions = [
        {
          id: 'et-1',
          type: 'expense' as const,
          category: 'rent',
          amount: 1200, // Over budget!
          date: Timestamp.fromDate(new Date('2023-10-05')),
          projectId: 'proj-1',
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
          householdId,
        },
      ];

      vi.mocked(projectTransactionService.getProjectTransactions).mockResolvedValue(
        projectTransactions,
      );
      vi.mocked(transactionService.getTransactions)
        .mockResolvedValueOnce(expenseTransactions)
        .mockResolvedValueOnce([]);

      const result = await budgetService.getMonthlyStats(householdId, 2023, 10);

      expect(result.stats[0].isOverBudget).toBe(true);
      expect(result.stats[0].remaining).toBe(-200);
      expect(result.stats[0].percentageUsed).toBe(120);
    });

    it('should handle zero income gracefully', async () => {
      const projects = [{ id: 'proj-1', name: 'Housing', icon: '🏠', color: '#4CAF50' }];
      vi.mocked(projectService.getProjects).mockResolvedValue(projects);

      vi.mocked(projectTransactionService.getProjectTransactions).mockResolvedValue([]);
      vi.mocked(transactionService.getTransactions)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await budgetService.getMonthlyStats(householdId, 2023, 10);

      expect(result.totalIncome).toBe(0);
      expect(result.stats[0].percentage).toBe(0); // Should not divide by zero
    });

    it('should handle zero allocation gracefully', async () => {
      const projects = [{ id: 'proj-1', name: 'Housing', icon: '🏠', color: '#4CAF50' }];
      vi.mocked(projectService.getProjects).mockResolvedValue(projects);

      vi.mocked(projectTransactionService.getProjectTransactions).mockResolvedValue([]);
      vi.mocked(transactionService.getTransactions)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await budgetService.getMonthlyStats(householdId, 2023, 10);

      expect(result.stats[0].percentageUsed).toBe(0); // Should not divide by zero
    });
  });
});
