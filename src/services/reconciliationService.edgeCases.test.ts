import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reconciliationService } from './reconciliationService';
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
vi.mock('./accountService', () => ({
  accountService: {
    getAccounts: vi.fn(),
    getSnapshots: vi.fn(),
  },
}));

vi.mock('./projectService', () => ({
  projectService: {
    getProjects: vi.fn(),
    getSnapshots: vi.fn(),
  },
}));

import { accountService } from './accountService';
import { projectService } from './projectService';

describe('reconciliationService - Edge Cases', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(accountService.getAccounts).mockResolvedValue([]);
    vi.mocked(accountService.getSnapshots).mockResolvedValue([]);
    vi.mocked(projectService.getProjects).mockResolvedValue([]);
    vi.mocked(projectService.getSnapshots).mockResolvedValue([]);
  });

  it('should handle year boundary (January uses December of previous year)', async () => {
    const accounts = [
      {
        id: 'acc-1',
        name: 'Bank Account',
        type: 'bank' as const,
        currency: 'USD',
        createdAt: Timestamp.now(),
      },
    ];
    vi.mocked(accountService.getAccounts).mockResolvedValue(accounts);

    // Mock account snapshots for Jan 2023 and Dec 2022
    vi.mocked(accountService.getSnapshots)
      .mockResolvedValueOnce([
        {
          id: 's1',
          year: 2023,
          month: 1,
          amount: 5000,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 's2',
          year: 2022,
          month: 12,
          amount: 4500,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ]);

    vi.mocked(projectService.getProjects).mockResolvedValue([]);

    const report = await reconciliationService.getReconciliationReport(householdId, 2023, 1);

    expect(report.year).toBe(2023);
    expect(report.month).toBe(1);
    expect(report.previousMonth.year).toBe(2022);
    expect(report.previousMonth.month).toBe(12);
    expect(report.previousMonth.totalBalance).toBe(4500);
    expect(report.currentMonth.totalBalance).toBe(5000);
    expect(report.actualChange).toBe(500);
  });

  it('should handle zero previous balance (avoid division by zero)', async () => {
    const accounts = [
      {
        id: 'acc-1',
        name: 'Bank Account',
        type: 'bank' as const,
        currency: 'USD',
        createdAt: Timestamp.now(),
      },
    ];
    vi.mocked(accountService.getAccounts).mockResolvedValue(accounts);

    // Mock snapshots with zero previous balance
    vi.mocked(accountService.getSnapshots)
      .mockResolvedValueOnce([
        {
          id: 's1',
          year: 2023,
          month: 10,
          amount: 1000,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ])
      .mockResolvedValueOnce([]); // No previous snapshot = 0 balance

    const projects = [
      {
        id: 'proj-1',
        name: 'Project 1',
        icon: '🏠',
        color: '#4CAF50',
        isPersonal: false,
        isActive: true,
      },
    ];
    vi.mocked(projectService.getProjects).mockResolvedValue(projects);

    vi.mocked(projectService.getSnapshots).mockResolvedValueOnce([
      {
        id: 'ps1',
        year: 2023,
        month: 10,
        openingBalance: 0,
        income: 1000,
        expense: 0,
        closingBalance: 1000,
        createdAt: Timestamp.now(),
      },
    ]);

    const report = await reconciliationService.getReconciliationReport(householdId, 2023, 10);

    expect(report.previousMonth.totalBalance).toBe(0);
    expect(report.actualChange).toBe(1000);
    expect(report.expectedChange).toBe(1000);
    expect(report.discrepancy).toBe(0);
    expect(report.discrepancyPercentage).toBe(0); // Should handle division by zero
    expect(report.hasDiscrepancy).toBe(false);
  });

  it('should detect discrepancy when threshold exceeded', async () => {
    const accounts = [
      {
        id: 'acc-1',
        name: 'Bank Account',
        type: 'bank' as const,
        currency: 'USD',
        createdAt: Timestamp.now(),
      },
    ];
    vi.mocked(accountService.getAccounts).mockResolvedValue(accounts);

    vi.mocked(accountService.getSnapshots)
      .mockResolvedValueOnce([
        {
          id: 's1',
          year: 2023,
          month: 10,
          amount: 1000,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 's2',
          year: 2023,
          month: 9,
          amount: 900,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ]);

    const projects = [
      {
        id: 'proj-1',
        name: 'Project 1',
        icon: '🏠',
        color: '#4CAF50',
        isPersonal: false,
        isActive: true,
      },
    ];
    vi.mocked(projectService.getProjects).mockResolvedValue(projects);

    vi.mocked(projectService.getSnapshots).mockResolvedValueOnce([
      {
        id: 'ps1',
        year: 2023,
        month: 10,
        openingBalance: 900,
        income: 200,
        expense: 100,
        closingBalance: 1000,
        createdAt: Timestamp.now(),
      },
    ]);

    const report = await reconciliationService.getReconciliationReport(householdId, 2023, 10);

    // Actual change: 1000 - 900 = 100
    // Expected change: 200 - 100 = 100
    // Discrepancy: 100 - 100 = 0
    expect(report.discrepancy).toBe(0);
    expect(report.hasDiscrepancy).toBe(false);
  });

  it('should detect small discrepancy within threshold', async () => {
    const accounts = [
      {
        id: 'acc-1',
        name: 'Bank Account',
        type: 'bank' as const,
        currency: 'USD',
        createdAt: Timestamp.now(),
      },
    ];
    vi.mocked(accountService.getAccounts).mockResolvedValue(accounts);

    vi.mocked(accountService.getSnapshots)
      .mockResolvedValueOnce([
        {
          id: 's1',
          year: 2023,
          month: 10,
          amount: 1000.005,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 's2',
          year: 2023,
          month: 9,
          amount: 900,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ]);

    const projects = [
      {
        id: 'proj-1',
        name: 'Project 1',
        icon: '🏠',
        color: '#4CAF50',
        isPersonal: false,
        isActive: true,
      },
    ];
    vi.mocked(projectService.getProjects).mockResolvedValue(projects);

    vi.mocked(projectService.getSnapshots).mockResolvedValueOnce([
      {
        id: 'ps1',
        year: 2023,
        month: 10,
        openingBalance: 900,
        income: 200,
        expense: 100,
        closingBalance: 1000,
        createdAt: Timestamp.now(),
      },
    ]);

    const report = await reconciliationService.getReconciliationReport(householdId, 2023, 10);

    // Discrepancy should be very small (< 0.01)
    expect(Math.abs(report.discrepancy)).toBeLessThan(0.01);
    expect(report.hasDiscrepancy).toBe(false);
  });

  it('should handle projects with no snapshots', async () => {
    const accounts = [
      {
        id: 'acc-1',
        name: 'Bank Account',
        type: 'bank' as const,
        currency: 'USD',
        createdAt: Timestamp.now(),
      },
    ];
    vi.mocked(accountService.getAccounts).mockResolvedValue(accounts);

    vi.mocked(accountService.getSnapshots)
      .mockResolvedValueOnce([
        {
          id: 's1',
          year: 2023,
          month: 10,
          amount: 1000,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 's2',
          year: 2023,
          month: 9,
          amount: 900,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ]);

    const projects = [
      {
        id: 'proj-1',
        name: 'Project 1',
        icon: '🏠',
        color: '#4CAF50',
        isPersonal: false,
        isActive: true,
      },
      {
        id: 'proj-2',
        name: 'Project 2',
        icon: '🚗',
        color: '#2196F3',
        isPersonal: false,
        isActive: true,
      },
    ];
    vi.mocked(projectService.getProjects).mockResolvedValue(projects);

    // Both projects have no snapshots
    vi.mocked(projectService.getSnapshots).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const report = await reconciliationService.getReconciliationReport(householdId, 2023, 10);

    expect(report.expected.totalIncome).toBe(0);
    expect(report.expected.totalExpense).toBe(0);
    expect(report.expected.incomeByProject).toEqual({});
    expect(report.expected.expenseByProject).toEqual({});
    expect(report.expectedChange).toBe(0);
  });

  it('should handle projects with zero income or expense', async () => {
    const accounts = [
      {
        id: 'acc-1',
        name: 'Bank Account',
        type: 'bank' as const,
        currency: 'USD',
        createdAt: Timestamp.now(),
      },
    ];
    vi.mocked(accountService.getAccounts).mockResolvedValue(accounts);

    vi.mocked(accountService.getSnapshots)
      .mockResolvedValueOnce([
        {
          id: 's1',
          year: 2023,
          month: 10,
          amount: 1000,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 's2',
          year: 2023,
          month: 9,
          amount: 900,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ]);

    const projects = [
      {
        id: 'proj-1',
        name: 'Project 1',
        icon: '🏠',
        color: '#4CAF50',
        isPersonal: false,
        isActive: true,
      },
    ];
    vi.mocked(projectService.getProjects).mockResolvedValue(projects);

    vi.mocked(projectService.getSnapshots).mockResolvedValueOnce([
      {
        id: 'ps1',
        year: 2023,
        month: 10,
        openingBalance: 900,
        income: 0, // Zero income
        expense: 0, // Zero expense
        closingBalance: 900,
        createdAt: Timestamp.now(),
      },
    ]);

    const report = await reconciliationService.getReconciliationReport(householdId, 2023, 10);

    // Should not add zero values to the byProject records
    expect(report.expected.incomeByProject).toEqual({});
    expect(report.expected.expenseByProject).toEqual({});
    expect(report.expected.totalIncome).toBe(0);
    expect(report.expected.totalExpense).toBe(0);
  });

  it('should handle multiple accounts with missing snapshots', async () => {
    const accounts = [
      {
        id: 'acc-1',
        name: 'Bank Account',
        type: 'bank' as const,
        currency: 'USD',
        createdAt: Timestamp.now(),
      },
      {
        id: 'acc-2',
        name: 'Cash',
        type: 'cash' as const,
        currency: 'USD',
        createdAt: Timestamp.now(),
      },
      {
        id: 'acc-3',
        name: 'Savings',
        type: 'bank' as const,
        currency: 'USD',
        createdAt: Timestamp.now(),
      },
    ];
    vi.mocked(accountService.getAccounts).mockResolvedValue(accounts);

    vi.mocked(accountService.getSnapshots)
      // acc-1 current
      .mockResolvedValueOnce([
        {
          id: 's1',
          year: 2023,
          month: 10,
          amount: 5000,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ])
      // acc-1 previous
      .mockResolvedValueOnce([
        {
          id: 's2',
          year: 2023,
          month: 9,
          amount: 4000,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ])
      // acc-2 current (no snapshot)
      .mockResolvedValueOnce([])
      // acc-2 previous
      .mockResolvedValueOnce([
        {
          id: 's3',
          year: 2023,
          month: 9,
          amount: 500,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ])
      // acc-3 current
      .mockResolvedValueOnce([
        {
          id: 's4',
          year: 2023,
          month: 10,
          amount: 2000,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ])
      // acc-3 previous (no snapshot)
      .mockResolvedValueOnce([]);

    vi.mocked(projectService.getProjects).mockResolvedValue([]);

    const report = await reconciliationService.getReconciliationReport(householdId, 2023, 10);

    // Only count accounts with snapshots
    expect(report.currentMonth.totalBalance).toBe(7000); // 5000 + 0 + 2000
    expect(report.previousMonth.totalBalance).toBe(4500); // 4000 + 500 + 0
  });
});
