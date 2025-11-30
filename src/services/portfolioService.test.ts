import { describe, it, expect, vi, beforeEach } from 'vitest';
import { portfolioService } from './portfolioService';
import { accountService } from './accountService';
import { Timestamp } from 'firebase/firestore';
import type { Portfolio, PortfolioSnapshot, Account, AccountSnapshot } from '../schemas';

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: 'new-snapshot-id' })),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
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

// Mock accountService
vi.mock('./accountService', () => ({
  accountService: {
    getAccount: vi.fn(),
    getSnapshots: vi.fn(),
  },
}));

import { setDoc } from 'firebase/firestore';

describe('portfolioService', () => {
  const householdId = 'test-household';
  const portfolioId = 'portfolio-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSnapshot', () => {
    it('should create a portfolio snapshot with correct calculations', async () => {
      // Mock portfolio
      vi.spyOn(portfolioService, 'getPortfolio').mockResolvedValueOnce({
        id: portfolioId,
        name: 'My Portfolio',
        accountIds: ['acc-1', 'acc-2'],
        isActive: true,
        createdAt: Timestamp.now(),
      } as Portfolio);

      // Mock accounts
      vi.mocked(accountService.getAccount).mockImplementation(async (_hid: string, id: string) => {
        if (id === 'acc-1') return { id: 'acc-1', name: 'Stock', type: 'investment' } as Account;
        if (id === 'acc-2') return { id: 'acc-2', name: 'Cash', type: 'bank' } as Account;
        return null;
      });

      // Mock account snapshots (Current Month)
      vi.mocked(accountService.getSnapshots).mockImplementation(async (_hid: string, id: string, year?: number, month?: number) => {
        if (year === 2025 && month === 1) {
          if (id === 'acc-1') return [{ amount: 10000, holdings: [] }] as AccountSnapshot[];
          if (id === 'acc-2') return [{ amount: 5000 }] as AccountSnapshot[];
        }
        return [];
      });

      // Mock previous portfolio snapshot (for performance)
      // We spy on getSnapshots to return the previous snapshot directly, avoiding getDocs mock complexity
      vi.spyOn(portfolioService, 'getSnapshots').mockResolvedValueOnce([
        {
          id: 'prev-snap',
          year: 2024,
          month: 12,
          totalValue: 14000,
          performance: {
            closingValue: 14000,
            cumulativeGain: 1000,
            cumulativeReturnRate: 10,
          },
        } as PortfolioSnapshot,
      ]);

      const cashFlow = { deposits: 1000, withdrawals: 0 };
      await portfolioService.createSnapshot(
        householdId,
        portfolioId,
        2025,
        1,
        'user-1',
        cashFlow,
      );

      // Verify setDoc called with correct data
      // Total Value = 10000 + 5000 = 15000
      // Opening Value = 14000
      // Net Cash Flow = 1000
      // Gain = 15000 - 14000 - 1000 = 0
      // Return Rate = 0 / (14000 + 1000) = 0
      // Cumulative Gain = 1000 + 0 = 1000
      // Cumulative Return Rate = (1.10 * 1.00 - 1) * 100 = 10

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          year: 2025,
          month: 1,
          totalValue: 15000,
          cashFlow: { deposits: 1000, withdrawals: 0 },
        }),
      );

      // Check performance object separately to handle floating point
      const callArgs = vi.mocked(setDoc).mock.calls[0];
      const savedSnapshot = callArgs[1] as Record<string, unknown>;
      const performance = savedSnapshot.performance as Record<string, number>;

      expect(performance.openingValue).toBe(14000);
      expect(performance.closingValue).toBe(15000);
      expect(performance.netCashFlow).toBe(1000);
      expect(performance.gain).toBe(0);
      expect(performance.returnRate).toBe(0);
      expect(performance.cumulativeGain).toBe(1000);
      // Total Invested = 15000 - 1000 = 14000
      // Rate = 1000 / 14000 * 100 = 7.1428...
      expect(performance.cumulativeReturnRate).toBeCloseTo(7.1428);
    });

    it('should handle first snapshot with initial deposit and gain', async () => {
       // Mock portfolio
       vi.spyOn(portfolioService, 'getPortfolio').mockResolvedValueOnce({
        id: portfolioId,
        name: 'My Portfolio',
        accountIds: ['acc-1'],
        isActive: true,
        createdAt: Timestamp.now(),
      } as Portfolio);

      vi.mocked(accountService.getAccount).mockResolvedValue({ id: 'acc-1', name: 'Stock', type: 'investment' } as Account);
      
      // Value is 11000 (10000 deposit + 1000 gain)
      vi.mocked(accountService.getSnapshots).mockResolvedValue([{ amount: 11000 }] as AccountSnapshot[]);

      // Mock getSnapshots to return empty
      vi.spyOn(portfolioService, 'getSnapshots').mockResolvedValueOnce([]);

      const cashFlow = { deposits: 10000, withdrawals: 0 };
      await portfolioService.createSnapshot(
        householdId,
        portfolioId,
        2025,
        1,
        'user-1',
        cashFlow,
      );

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          totalValue: 11000,
          performance: expect.objectContaining({
            openingValue: 0,
            gain: 1000,
            returnRate: 10,
            cumulativeGain: 1000,
            cumulativeReturnRate: 10,
          }),
        }),
      );
    });
  });
});
