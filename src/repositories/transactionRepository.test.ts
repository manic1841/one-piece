import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transactionRepository } from './transactionRepository';
import {
  Timestamp,
  QuerySnapshot,
  type DocumentReference,
  type DocumentSnapshot,
} from 'firebase/firestore';

import { setDoc, getDocs, getDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

describe('transactionRepository', () => {
  const householdId = 'test-household';
  const userEmail = 'test@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should call setDoc with correct data', async () => {
      const transactionData = {
        amount: 100,
        type: 'expense' as const,
        category: 'food',
        date: new Date('2023-10-01'),
        description: 'Lunch',
        projectId: 'project-1',
      };

      // Mock doc to return a reference with an ID
      const mockDocRef = { id: 'new-id' } as DocumentReference;
      vi.mocked(doc).mockReturnValue(mockDocRef);

      const result = await transactionRepository.create([householdId], transactionData, userEmail);

      expect(setDoc).toHaveBeenCalled();
      expect(result).toBe('new-id');
    });
  });

  describe('list', () => {
    it('should return all transactions', async () => {
      const mockTransactions = [
        {
          id: '1',
          amount: 100,
          type: 'expense',
          category: 'food',
          date: Timestamp.fromDate(new Date('2023-10-01')),
          projectId: 'p1',
          createdBy: 'u1',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockTransactions.map((t) => ({
          id: t.id,
          data: () => t,
        })),
      } as unknown as QuerySnapshot);

      const result = await transactionRepository.list([householdId]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('get', () => {
    it('should return transaction if exists', async () => {
      const mockTransaction = {
        id: '1',
        amount: 100,
        type: 'expense',
        category: 'food',
        date: Timestamp.fromDate(new Date('2023-10-01')),
        projectId: 'p1',
        createdBy: 'u1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockTransaction,
        id: '1',
        ref: {} as unknown,
        metadata: {} as unknown,
      } as unknown as DocumentSnapshot);

      const result = await transactionRepository.get([householdId, '1']);
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

      const result = await transactionRepository.get([householdId, '1']);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should call updateDoc', async () => {
      await transactionRepository.update([householdId, '1'], { amount: 200 }, userEmail);
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should call deleteDoc', async () => {
      await transactionRepository.delete([householdId, '1']);
      expect(deleteDoc).toHaveBeenCalled();
    });
  });
});
