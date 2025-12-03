import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accountService } from './accountService';
import { accountRepository } from '../repositories/accountRepository';
import { Timestamp } from 'firebase/firestore';
import type { Account, AccountSnapshot } from '../schemas';

// Mock AccountRepository
vi.mock('../repositories/accountRepository', () => ({
  accountRepository: {
    create: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createSnapshot: vi.fn(),
    getSnapshots: vi.fn(),
    updateSnapshot: vi.fn(),
    deleteSnapshot: vi.fn(),
  },
}));

describe('accountService', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordSnapshot', () => {
    it('should record an account snapshot', async () => {
      const snapshotData = {
        year: 2023,
        month: 10,
        amount: 5000,
        createdBy: 'user-1',
      };

      vi.mocked(accountRepository.createSnapshot).mockResolvedValue('new-snapshot-id');

      const result = await accountService.recordSnapshot(householdId, 'acc-1', snapshotData);

      expect(result).toBe('new-snapshot-id');
      expect(accountRepository.createSnapshot).toHaveBeenCalledWith(
        householdId,
        'acc-1',
        snapshotData,
      );
    });
  });

  describe('getSnapshots', () => {
    it('should return snapshots', async () => {
      const mockSnapshots = [
        {
          id: 'snap-1',
          year: 2023,
          month: 10,
          amount: 5000,
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
        },
      ];

      vi.mocked(accountRepository.getSnapshots).mockResolvedValue(
        mockSnapshots as AccountSnapshot[],
      );

      const result = await accountService.getSnapshots(householdId, 'acc-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('snap-1');
    });
  });

  describe('getLatestSnapshots', () => {
    it('should return latest snapshot for each account', async () => {
      const mockAccounts = [
        {
          id: 'acc-1',
          name: 'Bank Account',
          type: 'bank' as const,
          currency: 'TWD',
          createdAt: Timestamp.now(),
        },
        {
          id: 'acc-2',
          name: 'Cash',
          type: 'cash' as const,
          currency: 'TWD',
          createdAt: Timestamp.now(),
        },
      ];

      const mockSnapshots1 = [
        {
          id: 'snap-1',
          year: 2023,
          month: 10,
          amount: 5000,
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
        },
      ];

      const mockSnapshots2 = [
        {
          id: 'snap-2',
          year: 2023,
          month: 10,
          amount: 1000,
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
        },
      ];

      vi.mocked(accountRepository.getAll).mockResolvedValue(mockAccounts as Account[]);
      vi.mocked(accountRepository.getSnapshots)
        .mockResolvedValueOnce(mockSnapshots1 as AccountSnapshot[])
        .mockResolvedValueOnce(mockSnapshots2 as AccountSnapshot[]);

      const result = await accountService.getLatestSnapshots(householdId);

      expect(result.size).toBe(2);
      expect(result.get('acc-1')?.amount).toBe(5000);
      expect(result.get('acc-2')?.amount).toBe(1000);
    });
  });

  describe('getTotalAssets', () => {
    it('should calculate total assets from all account snapshots', async () => {
      const mockAccounts = [
        {
          id: 'acc-1',
          name: 'Bank Account',
          type: 'bank' as const,
          currency: 'TWD',
          createdAt: Timestamp.now(),
        },
        {
          id: 'acc-2',
          name: 'Cash',
          type: 'cash' as const,
          currency: 'TWD',
          createdAt: Timestamp.now(),
        },
      ];

      const mockSnapshots1 = [
        {
          id: 'snap-1',
          year: 2023,
          month: 10,
          amount: 5000,
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
        },
      ];

      const mockSnapshots2 = [
        {
          id: 'snap-2',
          year: 2023,
          month: 10,
          amount: 1500,
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
        },
      ];

      vi.mocked(accountRepository.getAll).mockResolvedValue(mockAccounts as Account[]);
      vi.mocked(accountRepository.getSnapshots)
        .mockResolvedValueOnce(mockSnapshots1 as AccountSnapshot[])
        .mockResolvedValueOnce(mockSnapshots2 as AccountSnapshot[]);

      const result = await accountService.getTotalAssets(householdId);

      expect(result).toBe(6500); // 5000 + 1500
    });
  });
});
