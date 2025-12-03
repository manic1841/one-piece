import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accountRepository } from './accountRepository';
import {
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  type DocumentSnapshot,
  type DocumentReference,
  type QuerySnapshot,
} from 'firebase/firestore';

describe('accountRepository', () => {
  const householdId = 'test-household';
  const accountId = 'acc-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should call setDoc with correct data', async () => {
      const accountData = {
        name: 'Test Account',
        type: 'bank' as const,
        currency: 'TWD',
        createdBy: 'user-1',
      };

      const mockDocRef = { id: 'new-id' } as DocumentReference;
      vi.mocked(doc).mockReturnValue(mockDocRef);

      const result = await accountRepository.create(householdId, accountData);

      expect(setDoc).toHaveBeenCalled();
      expect(result).toBe('new-id');
    });
  });

  describe('getAll', () => {
    it('should return all accounts', async () => {
      const mockAccounts = [
        {
          id: '1',
          name: 'Test Account',
          type: 'bank',
          currency: 'TWD',
          createdAt: Timestamp.now(),
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockAccounts.map((a) => ({
          id: a.id,
          data: () => a,
        })),
      } as unknown as QuerySnapshot);

      const result = await accountRepository.getAll(householdId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('getById', () => {
    it('should return account if exists', async () => {
      const mockAccount = {
        id: '1',
        name: 'Test Account',
        type: 'bank',
        currency: 'TWD',
        createdAt: Timestamp.now(),
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockAccount,
        id: '1',
        ref: {} as unknown,
        metadata: {} as unknown,
      } as unknown as DocumentSnapshot);

      const result = await accountRepository.getById(householdId, '1');
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
    });

    it('should return null if not exists', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => undefined,
        id: '1',
        ref: {} as unknown,
        metadata: {} as unknown,
      } as unknown as DocumentSnapshot);

      const result = await accountRepository.getById(householdId, '1');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should call updateDoc', async () => {
      await accountRepository.update(householdId, '1', { name: 'Updated Name' });
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should call deleteDoc', async () => {
      await accountRepository.delete(householdId, '1');
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  describe('createSnapshot', () => {
    it('should call setDoc with correct data', async () => {
      const snapshotData = {
        year: 2023,
        month: 10,
        amount: 1000,
        createdBy: 'user-1',
      };

      const mockDocRef = { id: 'snap-1' } as DocumentReference;
      vi.mocked(doc).mockReturnValue(mockDocRef);

      const result = await accountRepository.createSnapshot(householdId, accountId, snapshotData);

      expect(setDoc).toHaveBeenCalled();
      expect(result).toBe('snap-1');
    });
  });

  describe('getSnapshots', () => {
    it('should return snapshots', async () => {
      const mockSnapshots = [
        {
          id: 'snap-1',
          year: 2023,
          month: 10,
          amount: 1000,
          createdBy: 'user-1',
          createdAt: Timestamp.now(),
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockSnapshots.map((s) => ({
          id: s.id,
          data: () => s,
        })),
      } as unknown as QuerySnapshot);

      const result = await accountRepository.getSnapshots(householdId, accountId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('snap-1');
    });
  });

  describe('updateSnapshot', () => {
    it('should call setDoc with merge true', async () => {
      await accountRepository.updateSnapshot(householdId, accountId, 'snap-1', { amount: 2000 });
      expect(setDoc).toHaveBeenCalledWith(expect.anything(), expect.anything(), { merge: true });
    });
  });

  describe('deleteSnapshot', () => {
    it('should call deleteDoc', async () => {
      await accountRepository.deleteSnapshot(householdId, accountId, 'snap-1');
      expect(deleteDoc).toHaveBeenCalled();
    });
  });
});
