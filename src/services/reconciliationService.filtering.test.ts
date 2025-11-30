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

describe('reconciliationService - Filtering', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(accountService.getAccounts).mockResolvedValue([]);
    vi.mocked(accountService.getSnapshots).mockResolvedValue([]);
    vi.mocked(projectService.getProjects).mockResolvedValue([]);
    vi.mocked(projectService.getSnapshots).mockResolvedValue([]);
  });

  it('should exclude accounts with includeInReconciliation=false from reconciliation', async () => {
    const accounts = [
      {
        id: 'acc-1',
        name: 'Bank Account',
        type: 'bank' as const,
        includeInReconciliation: true,
        currency: 'USD',
        createdAt: Timestamp.now(),
      },
      {
        id: 'acc-2',
        name: 'Cash',
        type: 'cash' as const,
        includeInReconciliation: false,
        currency: 'USD',
        createdAt: Timestamp.now(),
      },
      {
        id: 'acc-3',
        name: 'Savings',
        type: 'bank' as const,
        currency: 'USD',
        createdAt: Timestamp.now(),
      }, // undefined should default to true
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
      // acc-2 should be skipped (includeInReconciliation: false)
      // acc-3 current
      .mockResolvedValueOnce([
        {
          id: 's3',
          year: 2023,
          month: 10,
          amount: 2000,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ])
      // acc-3 previous
      .mockResolvedValueOnce([
        {
          id: 's4',
          year: 2023,
          month: 9,
          amount: 1500,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ]);

    vi.mocked(projectService.getProjects).mockResolvedValue([]);

    const report = await reconciliationService.getReconciliationReport(householdId, 2023, 10);

    // Should only include acc-1 and acc-3, not acc-2
    expect(report.currentMonth.totalBalance).toBe(7000); // 5000 + 2000
    expect(report.previousMonth.totalBalance).toBe(5500); // 4000 + 1500
    expect(report.actualChange).toBe(1500); // 7000 - 5500
  });

  it('should exclude projects with includeInReconciliation=false from reconciliation', async () => {
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
          amount: 2000,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 's2',
          year: 2023,
          month: 9,
          amount: 1000,
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
        includeInReconciliation: true,
        isPersonal: false,
        isActive: true,
      },
      {
        id: 'proj-2',
        name: 'Project 2',
        icon: '🚗',
        color: '#2196F3',
        includeInReconciliation: false,
        isPersonal: false,
        isActive: true,
      },
      {
        id: 'proj-3',
        name: 'Project 3',
        icon: '🍕',
        color: '#FF5722',
        isPersonal: false,
        isActive: true,
      }, // undefined should default to true
    ];
    vi.mocked(projectService.getProjects).mockResolvedValue(projects);

    vi.mocked(projectService.getSnapshots)
      // proj-1
      .mockResolvedValueOnce([
        {
          id: 'ps1',
          year: 2023,
          month: 10,
          openingBalance: 1000,
          income: 800,
          expense: 300,
          closingBalance: 1500,
          createdAt: Timestamp.now(),
        },
      ])
      // proj-2 should be skipped (includeInReconciliation: false)
      // proj-3
      .mockResolvedValueOnce([
        {
          id: 'ps3',
          year: 2023,
          month: 10,
          openingBalance: 500,
          income: 200,
          expense: 100,
          closingBalance: 600,
          createdAt: Timestamp.now(),
        },
      ]);

    const report = await reconciliationService.getReconciliationReport(householdId, 2023, 10);

    // Should only include proj-1 and proj-3, not proj-2
    expect(report.expected.totalIncome).toBe(1000); // 800 + 200
    expect(report.expected.totalExpense).toBe(400); // 300 + 100
    expect(report.expected.incomeByProject).toEqual({
      'proj-1': 800,
      'proj-3': 200,
    });
    expect(report.expected.expenseByProject).toEqual({
      'proj-1': 300,
      'proj-3': 100,
    });
    expect(report.expectedChange).toBe(600); // 1000 - 400
  });

  it('should handle backward compatibility when includeInReconciliation is undefined', async () => {
    const accounts = [
      {
        id: 'acc-1',
        name: 'Bank Account',
        type: 'bank' as const,
        currency: 'USD',
        createdAt: Timestamp.now(),
      }, // no includeInReconciliation field
    ];
    vi.mocked(accountService.getAccounts).mockResolvedValue(accounts);

    vi.mocked(accountService.getSnapshots)
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
      .mockResolvedValueOnce([
        {
          id: 's2',
          year: 2023,
          month: 9,
          amount: 4000,
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
      }, // no includeInReconciliation field
    ];
    vi.mocked(projectService.getProjects).mockResolvedValue(projects);

    vi.mocked(projectService.getSnapshots).mockResolvedValueOnce([
      {
        id: 'ps1',
        year: 2023,
        month: 10,
        openingBalance: 1000,
        income: 500,
        expense: 200,
        closingBalance: 1300,
        createdAt: Timestamp.now(),
      },
    ]);

    const report = await reconciliationService.getReconciliationReport(householdId, 2023, 10);

    // Should include everything when includeInReconciliation is undefined
    expect(report.currentMonth.totalBalance).toBe(5000);
    expect(report.previousMonth.totalBalance).toBe(4000);
    expect(report.expected.totalIncome).toBe(500);
    expect(report.expected.totalExpense).toBe(200);
  });
});
