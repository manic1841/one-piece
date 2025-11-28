import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assetTrackingService } from './assetTrackingService';
import type { AssetDataPoint } from './assetTrackingService';

// Mock accountService
vi.mock('./accountService', () => ({
  accountService: {
    getAccounts: vi.fn(),
    getSnapshots: vi.fn(),
    getLatestSnapshots: vi.fn(),
  },
}));

import { accountService } from './accountService';

describe('assetTrackingService', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAssetTrend', () => {
    it('should aggregate asset data across accounts', async () => {
      const mockAccounts = [
        { id: 'acc-1', name: 'Bank', type: 'bank' as const, currency: 'TWD' },
        { id: 'acc-2', name: 'Cash', type: 'cash' as const, currency: 'TWD' },
      ];

      vi.mocked(accountService.getAccounts).mockResolvedValue(mockAccounts);

      vi.mocked(accountService.getSnapshots)
        .mockResolvedValueOnce([
          { id: 's1', year: 2023, month: 10, amount: 10000 } as never,
          { id: 's2', year: 2023, month: 11, amount: 12000 } as never,
        ])
        .mockResolvedValueOnce([
          { id: 's3', year: 2023, month: 10, amount: 5000 } as never,
          { id: 's4', year: 2023, month: 11, amount: 6000 } as never,
        ]);

      const result = await assetTrackingService.getAssetTrend(householdId, 12);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2023/10');
      expect(result[0].totalAssets).toBe(15000); // 10000 + 5000
      expect(result[1].totalAssets).toBe(18000); // 12000 + 6000
    });

    it('should limit results to specified months', async () => {
      const mockAccounts = [{ id: 'acc-1', name: 'Bank', type: 'bank' as const, currency: 'TWD' }];

      vi.mocked(accountService.getAccounts).mockResolvedValue(mockAccounts);

      vi.mocked(accountService.getSnapshots).mockResolvedValue([
        { id: 's1', year: 2023, month: 1, amount: 1000 } as never,
        { id: 's2', year: 2023, month: 2, amount: 2000 } as never,
        { id: 's3', year: 2023, month: 3, amount: 3000 } as never,
      ]);

      const result = await assetTrackingService.getAssetTrend(householdId, 2);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2023/02');
      expect(result[1].date).toBe('2023/03');
    });

    it('should handle empty accounts', async () => {
      vi.mocked(accountService.getAccounts).mockResolvedValue([]);

      const result = await assetTrackingService.getAssetTrend(householdId, 12);

      expect(result).toEqual([]);
    });
  });

  describe('getAccountTrends', () => {
    it('should return trends for each account', async () => {
      const mockAccounts = [
        { id: 'acc-1', name: 'Bank', type: 'bank' as const, currency: 'TWD' },
        { id: 'acc-2', name: 'Cash', type: 'cash' as const, currency: 'TWD' },
      ];

      vi.mocked(accountService.getAccounts).mockResolvedValue(mockAccounts);

      vi.mocked(accountService.getSnapshots)
        .mockResolvedValueOnce([{ id: 's1', year: 2023, month: 10, amount: 10000 } as never])
        .mockResolvedValueOnce([{ id: 's2', year: 2023, month: 10, amount: 5000 } as never]);

      const result = await assetTrackingService.getAccountTrends(householdId, 12);

      expect(result).toHaveLength(2);
      expect(result[0].accountId).toBe('acc-1');
      expect(result[0].accountName).toBe('Bank');
      expect(result[0].data).toHaveLength(1);
      expect(result[0].data[0].balance).toBe(10000);
    });

    it('should exclude accounts with no snapshots', async () => {
      const mockAccounts = [
        { id: 'acc-1', name: 'Bank', type: 'bank' as const, currency: 'TWD' },
        { id: 'acc-2', name: 'Empty', type: 'cash' as const, currency: 'TWD' },
      ];

      vi.mocked(accountService.getAccounts).mockResolvedValue(mockAccounts);

      vi.mocked(accountService.getSnapshots)
        .mockResolvedValueOnce([{ id: 's1', year: 2023, month: 10, amount: 10000 } as never])
        .mockResolvedValueOnce([]);

      const result = await assetTrackingService.getAccountTrends(householdId, 12);

      expect(result).toHaveLength(1);
      expect(result[0].accountId).toBe('acc-1');
    });
  });

  describe('getAssetAllocation', () => {
    it('should calculate allocation by account type', async () => {
      const mockAccounts = [
        { id: 'acc-1', name: 'Bank 1', type: 'bank' as const, currency: 'TWD' },
        { id: 'acc-2', name: 'Bank 2', type: 'bank' as const, currency: 'TWD' },
        { id: 'acc-3', name: 'Cash', type: 'cash' as const, currency: 'TWD' },
      ];

      const mockSnapshots = new Map([
        ['acc-1', { id: 's1', year: 2023, month: 10, amount: 10000 } as never],
        ['acc-2', { id: 's2', year: 2023, month: 10, amount: 15000 } as never],
        ['acc-3', { id: 's3', year: 2023, month: 10, amount: 5000 } as never],
      ]);

      vi.mocked(accountService.getAccounts).mockResolvedValue(mockAccounts);
      vi.mocked(accountService.getLatestSnapshots).mockResolvedValue(mockSnapshots);

      const result = await assetTrackingService.getAssetAllocation(householdId);

      expect(result.bank).toBe(25000); // 10000 + 15000
      expect(result.cash).toBe(5000);
    });

    it('should handle accounts without snapshots', async () => {
      const mockAccounts = [{ id: 'acc-1', name: 'Bank', type: 'bank' as const, currency: 'TWD' }];

      vi.mocked(accountService.getAccounts).mockResolvedValue(mockAccounts);
      vi.mocked(accountService.getLatestSnapshots).mockResolvedValue(new Map());

      const result = await assetTrackingService.getAssetAllocation(householdId);

      expect(result).toEqual({});
    });
  });

  describe('calculateGrowth', () => {
    it('should calculate percentage growth', () => {
      const data: AssetDataPoint[] = [
        { date: '2023/01', totalAssets: 10000, accounts: {} },
        { date: '2023/06', totalAssets: 12000, accounts: {} },
      ];

      const result = assetTrackingService.calculateGrowth(data);

      expect(result).toBe(20); // (12000 - 10000) / 10000 * 100
    });

    it('should return 0 for insufficient data', () => {
      const data: AssetDataPoint[] = [{ date: '2023/01', totalAssets: 10000, accounts: {} }];

      const result = assetTrackingService.calculateGrowth(data);

      expect(result).toBe(0);
    });

    it('should return 0 when starting amount is 0', () => {
      const data: AssetDataPoint[] = [
        { date: '2023/01', totalAssets: 0, accounts: {} },
        { date: '2023/06', totalAssets: 5000, accounts: {} },
      ];

      const result = assetTrackingService.calculateGrowth(data);

      expect(result).toBe(0); // Prevent division by zero
    });

    it('should handle negative growth', () => {
      const data: AssetDataPoint[] = [
        { date: '2023/01', totalAssets: 10000, accounts: {} },
        { date: '2023/06', totalAssets: 8000, accounts: {} },
      ];

      const result = assetTrackingService.calculateGrowth(data);

      expect(result).toBe(-20); // (8000 - 10000) / 10000 * 100
    });
  });
});
