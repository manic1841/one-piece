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

describe('reconciliationService - Basic', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks
    vi.mocked(accountService.getAccounts).mockResolvedValue([]);
    vi.mocked(accountService.getSnapshots).mockResolvedValue([]);
    vi.mocked(projectService.getProjects).mockResolvedValue([]);
    vi.mocked(projectService.getSnapshots).mockResolvedValue([]);
  });

  it('should calculate reconciliation report with complete data', async () => {
    // Mock accounts
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
    ];
    vi.mocked(accountService.getAccounts).mockResolvedValue(accounts);

    // Mock account snapshots
    vi.mocked(accountService.getSnapshots)
      // Current month (Oct 2023)
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
      ])
      .mockResolvedValueOnce([
        {
          id: 's3',
          year: 2023,
          month: 10,
          amount: 1000,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 's4',
          year: 2023,
          month: 9,
          amount: 800,
          createdAt: Timestamp.now(),
          createdBy: 'test-user',
        },
      ]);

    // Mock projects
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

    // Mock project snapshots
    vi.mocked(projectService.getSnapshots)
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
      .mockResolvedValueOnce([
        {
          id: 'ps2',
          year: 2023,
          month: 10,
          openingBalance: 500,
          income: 400,
          expense: 200,
          closingBalance: 700,
          createdAt: Timestamp.now(),
        },
      ]);

    const report = await reconciliationService.getReconciliationReport(householdId, 2023, 10);

    expect(report.year).toBe(2023);
    expect(report.month).toBe(10);

    // Check previous month
    expect(report.previousMonth.year).toBe(2023);
    expect(report.previousMonth.month).toBe(9);
    expect(report.previousMonth.totalBalance).toBe(4800); // 4000 + 800

    // Check current month
    expect(report.currentMonth.year).toBe(2023);
    expect(report.currentMonth.month).toBe(10);
    expect(report.currentMonth.totalBalance).toBe(6000); // 5000 + 1000

    // Check actual change
    expect(report.actualChange).toBe(1200); // 6000 - 4800

    // Check expected income/expense
    expect(report.expected.totalIncome).toBe(1200); // 800 + 400
    expect(report.expected.totalExpense).toBe(500); // 300 + 200
    expect(report.expected.incomeByProject).toEqual({
      'proj-1': 800,
      'proj-2': 400,
    });
    expect(report.expected.expenseByProject).toEqual({
      'proj-1': 300,
      'proj-2': 200,
    });

    // Check expected change
    expect(report.expectedChange).toBe(700); // 1200 - 500

    // Check discrepancy
    expect(report.discrepancy).toBe(500); // 1200 - 700
    expect(report.discrepancyPercentage).toBeCloseTo(10.42, 2); // (500 / 4800) * 100
    expect(report.hasDiscrepancy).toBe(true);
  });
});
