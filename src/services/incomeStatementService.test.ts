import { describe, it, expect, vi, beforeEach } from 'vitest';
import { incomeStatementService } from './incomeStatementService';
import { transactionService } from './transactionService';
import { projectService } from './projectService';
import { Timestamp } from 'firebase/firestore';
import type { Transaction, Project } from '../schemas';

// Mock services
vi.mock('./transactionService', () => ({
  transactionService: {
    getTransactionsByPeriod: vi.fn(),
  },
}));

vi.mock('./projectService', () => ({
  projectService: {
    getProjects: vi.fn(),
  },
}));

// Mock Firebase
vi.mock('firebase/firestore', () => ({
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
    
    static now() {
      const date = new Date();
      return new this(Math.floor(date.getTime() / 1000), (date.getTime() % 1000) * 1000000);
    }
    
    static fromDate(date: Date) {
      return new this(Math.floor(date.getTime() / 1000), (date.getTime() % 1000) * 1000000);
    }
  },
}));

describe('incomeStatementService', () => {
  const householdId = 'test-household';
  const startDate = new Date(2025, 0, 1); // Jan 1, 2025
  const endDate = new Date(2025, 0, 31); // Jan 31, 2025
  const createdBy = 'test-user';

  const mockTransactions: Transaction[] = [
    {
      id: 'trans-1',
      date: Timestamp.fromDate(new Date(2025, 0, 5)),
      amount: 100000,
      type: 'income',
      projectId: 'proj-1',
      category: '薪資收入',
      description: 'January salary',
      createdBy: 'user-1',
      createdAt: Timestamp.now(),
    },
    {
      id: 'trans-2',
      date: Timestamp.fromDate(new Date(2025, 0, 10)),
      amount: 20000,
      type: 'income',
      projectId: 'proj-2',
      category: '獎金收入',
      createdBy: 'user-1',
      createdAt: Timestamp.now(),
    },
    {
      id: 'trans-3',
      date: Timestamp.fromDate(new Date(2025, 0, 15)),
      amount: 30000,
      type: 'expense',
      projectId: 'proj-3',
      category: '生活費用',
      description: 'Living expenses',
      createdBy: 'user-1',
      createdAt: Timestamp.now(),
    },
    {
      id: 'trans-4',
      date: Timestamp.fromDate(new Date(2025, 0, 20)),
      amount: 25000,
      type: 'expense',
      projectId: 'proj-4',
      category: '居住費用',
      description: 'Rent',
      createdBy: 'user-1',
      createdAt: Timestamp.now(),
    },
  ];

  const mockProjects: Project[] = [
    {
      id: 'proj-1',
      name: 'Salary',
      color: '#000',
      icon: '💰',
      isPersonal: false,
      isActive: true,
      accounting: {
        enabled: true,
        incomeStatement: {
          category: 'income',
          subcategory: '薪資收入',
          order: 1,
        },
      },
    },
    {
      id: 'proj-2',
      name: 'Bonus',
      color: '#111',
      icon: '🎁',
      isPersonal: false,
      isActive: true,
    },
    {
      id: 'proj-3',
      name: 'Living',
      color: '#222',
      icon: '🏠',
      isPersonal: false,
      isActive: true,
    },
    {
      id: 'proj-4',
      name: 'Housing',
      color: '#333',
      icon: '🏡',
      isPersonal: false,
      isActive: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateIncomeStatement', () => {
    it('should generate complete income statement', async () => {
      vi.mocked(transactionService.getTransactionsByPeriod).mockResolvedValue(mockTransactions);
      vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

      const statement = await incomeStatementService.generateIncomeStatement(
        householdId,
        startDate,
        endDate,
        createdBy,
      );

      expect(statement).toBeDefined();
      expect(statement.year).toBe(2025);
      expect(statement.month).toBe(1);
      expect(statement.periodType).toBe('monthly');
    });

    it('should correctly calculate income total', async () => {
      vi.mocked(transactionService.getTransactionsByPeriod).mockResolvedValue(mockTransactions);
      vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

      const statement = await incomeStatementService.generateIncomeStatement(
        householdId,
        startDate,
        endDate,
        createdBy,
      );

      expect(statement.income.total).toBe(120000); // 100000 + 20000
    });

    it('should correctly calculate expense total', async () => {
      vi.mocked(transactionService.getTransactionsByPeriod).mockResolvedValue(mockTransactions);
      vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

      const statement = await incomeStatementService.generateIncomeStatement(
        householdId,
        startDate,
        endDate,
        createdBy,
      );

      expect(statement.expense.total).toBe(55000); // 30000 + 25000
    });

    it('should correctly calculate net income', async () => {
      vi.mocked(transactionService.getTransactionsByPeriod).mockResolvedValue(mockTransactions);
      vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

      const statement = await incomeStatementService.generateIncomeStatement(
        householdId,
        startDate,
        endDate,
        createdBy,
      );

      expect(statement.netIncome).toBe(65000); // 120000 - 55000
    });

    it('should group transactions by category', async () => {
      vi.mocked(transactionService.getTransactionsByPeriod).mockResolvedValue(mockTransactions);
      vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

      const statement = await incomeStatementService.generateIncomeStatement(
        householdId,
        startDate,
        endDate,
        createdBy,
      );

      // Income should have 2 categories
      expect(statement.income.categories.length).toBe(2);
      
      // Expense should have 2 categories
      expect(statement.expense.categories.length).toBe(2);
    });

    it('should calculate category subtotals correctly', async () => {
      vi.mocked(transactionService.getTransactionsByPeriod).mockResolvedValue(mockTransactions);
      vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

      const statement = await incomeStatementService.generateIncomeStatement(
        householdId,
        startDate,
        endDate,
        createdBy,
      );

      const salaryCategory = statement.income.categories.find(c => c.category === '薪資收入');
      expect(salaryCategory?.subtotal).toBe(100000);

      const bonusCategory = statement.income.categories.find(c => c.category === '獎金收入');
      expect(bonusCategory?.subtotal).toBe(20000);
    });

    it('should handle empty transactions', async () => {
      vi.mocked(transactionService.getTransactionsByPeriod).mockResolvedValue([]);
      vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

      const statement = await incomeStatementService.generateIncomeStatement(
        householdId,
        startDate,
        endDate,
        createdBy,
      );

      expect(statement.income.total).toBe(0);
      expect(statement.expense.total).toBe(0);
      expect(statement.netIncome).toBe(0);
      expect(statement.income.categories.length).toBe(0);
      expect(statement.expense.categories.length).toBe(0);
    });

    it('should determine period type as quarterly', async () => {
      const quarterStart = new Date(2025, 0, 1); // Jan 1
      const quarterEnd = new Date(2025, 2, 31); // Mar 31
      
      vi.mocked(transactionService.getTransactionsByPeriod).mockResolvedValue([]);
      vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

      const statement = await incomeStatementService.generateIncomeStatement(
        householdId,
        quarterStart,
        quarterEnd,
        createdBy,
      );

      expect(statement.periodType).toBe('quarterly');
      expect(statement.quarter).toBe(1);
    });

    it('should determine period type as yearly', async () => {
      const yearStart = new Date(2025, 0, 1);
      const yearEnd = new Date(2025, 11, 31);
      
      vi.mocked(transactionService.getTransactionsByPeriod).mockResolvedValue([]);
      vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

      const statement = await incomeStatementService.generateIncomeStatement(
        householdId,
        yearStart,
        yearEnd,
        createdBy,
      );

      expect(statement.periodType).toBe('yearly');
      expect(statement.month).toBeUndefined();
      expect(statement.quarter).toBeUndefined();
    });
  });

  describe('getIncomeCategories', () => {
    it('should return income categories only', async () => {
      vi.mocked(transactionService.getTransactionsByPeriod).mockResolvedValue(mockTransactions);
      vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

      const categories = await incomeStatementService.getIncomeCategories(
        householdId,
        startDate,
        endDate,
      );

      expect(categories.length).toBe(2);
      expect(categories.every(c => c.items.every(i => i.category.includes('收入')))).toBe(true);
    });
  });

  describe('getExpenseCategories', () => {
    it('should return expense categories only', async () => {
      vi.mocked(transactionService.getTransactionsByPeriod).mockResolvedValue(mockTransactions);
      vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

      const categories = await incomeStatementService.getExpenseCategories(
        householdId,
        startDate,
        endDate,
      );

      expect(categories.length).toBe(2);
      expect(categories.every(c => c.items.every(i => i.category.includes('費用')))).toBe(true);
    });
  });

  describe('calculateNetIncome', () => {
    it('should calculate positive net income', () => {
      const netIncome = incomeStatementService.calculateNetIncome(120000, 55000);
      expect(netIncome).toBe(65000);
    });

    it('should calculate negative net income (loss)', () => {
      const netIncome = incomeStatementService.calculateNetIncome(50000, 80000);
      expect(netIncome).toBe(-30000);
    });

    it('should handle zero values', () => {
      const netIncome = incomeStatementService.calculateNetIncome(0, 0);
      expect(netIncome).toBe(0);
    });
  });
});
