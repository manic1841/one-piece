import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectTransactionRepository } from './projectTransactionRepository';
import {
  Timestamp,
  QuerySnapshot,
  type DocumentReference,
  type DocumentSnapshot,
  type Transaction as FirestoreTransaction,
} from 'firebase/firestore';
import { getDoc, getDocs, setDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';

describe('projectTransactionRepository', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new project transaction and return the ID', async () => {
      const newTransaction = {
        date: new Date('2024-01-01'),
        type: 'allocation' as const,
        toProject: 'project-1',
        amount: 5000,
        description: 'Test transaction',
        createdBy: 'user-1',
      };

      const mockDocRef = { id: 'new-transaction-id' } as DocumentReference;
      vi.mocked(doc).mockReturnValue(mockDocRef);

      const id = await projectTransactionRepository.create(householdId, newTransaction);

      expect(id).toBe('new-transaction-id');
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'allocation',
          amount: 5000,
          id: 'new-transaction-id',
        }),
      );
    });

    it('should support transaction parameter', async () => {
      const newTransaction = {
        date: new Date('2024-01-01'),
        type: 'transfer' as const,
        fromProject: 'project-1',
        toProject: 'project-2',
        amount: 1000,
        createdBy: 'user-1',
      };

      const mockDocRef = { id: 'new-transaction-id' } as DocumentReference;
      vi.mocked(doc).mockReturnValue(mockDocRef);

      const mockFirestoreTransaction = {
        set: vi.fn(),
      };

      const id = await projectTransactionRepository.create(
        householdId,
        newTransaction,
        mockFirestoreTransaction as unknown as FirestoreTransaction,
      );

      expect(id).toBe('new-transaction-id');
      expect(mockFirestoreTransaction.set).toHaveBeenCalled();
      expect(setDoc).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return project transaction when it exists', async () => {
      const mockTransaction = {
        id: 'transaction-1',
        date: new Timestamp(1704067200, 0),
        type: 'allocation',
        toProject: 'project-1',
        amount: 5000,
        createdBy: 'user-1',
        createdAt: new Timestamp(1704067200, 0),
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockTransaction,
        id: 'transaction-1',
        ref: {} as unknown,
        metadata: {} as unknown,
      } as unknown as DocumentSnapshot);

      const result = await projectTransactionRepository.getById(householdId, 'transaction-1');

      expect(result).toBeTruthy();
      expect(result?.amount).toBe(5000);
      expect(result?.type).toBe('allocation');
    });

    it('should return null when transaction does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => undefined,
        id: 'non-existent',
        ref: {} as unknown,
        metadata: {} as unknown,
      } as unknown as DocumentSnapshot);

      const result = await projectTransactionRepository.getById(householdId, 'non-existent');

      expect(result).toBe(null);
    });
  });

  describe('getAll', () => {
    it('should return all project transactions', async () => {
      const mockTransactions = [
        {
          id: 'trans-1',
          date: new Timestamp(1704067200, 0),
          type: 'allocation',
          toProject: 'project-1',
          amount: 5000,
          createdBy: 'user-1',
          createdAt: new Timestamp(1704067200, 0),
        },
        {
          id: 'trans-2',
          date: new Timestamp(1706745600, 0),
          type: 'transfer',
          fromProject: 'project-1',
          toProject: 'project-2',
          amount: 1000,
          createdBy: 'user-1',
          createdAt: new Timestamp(1706745600, 0),
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockTransactions.map((t) => ({
          id: t.id,
          data: () => t,
        })),
      } as unknown as QuerySnapshot);

      const result = await projectTransactionRepository.getAll(householdId);

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(5000);
      expect(result[1].amount).toBe(1000);
    });

    it('should return filtered transactions with query constraints', async () => {
      const mockTransactions = [
        {
          id: 'trans-1',
          date: new Timestamp(1704067200, 0),
          type: 'allocation',
          toProject: 'project-1',
          amount: 5000,
          createdBy: 'user-1',
          createdAt: new Timestamp(1704067200, 0),
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockTransactions.map((t) => ({
          id: t.id,
          data: () => t,
        })),
      } as unknown as QuerySnapshot);

      const result = await projectTransactionRepository.getAll(householdId, [
        where('toProject', '==', 'project-1'),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].toProject).toBe('project-1');
    });
  });

  describe('update', () => {
    it('should update a project transaction', async () => {
      await projectTransactionRepository.update(householdId, 'trans-1', {
        amount: 6000,
        description: 'Updated transaction',
      });

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          amount: 6000,
          description: 'Updated transaction',
        }),
      );
    });

    it('should convert Date to Timestamp when updating', async () => {
      const newDate = new Date('2024-02-01');
      await projectTransactionRepository.update(householdId, 'trans-1', {
        date: newDate,
      });

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          date: expect.any(Object),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should delete a project transaction', async () => {
      await projectTransactionRepository.delete(householdId, 'trans-1');

      expect(deleteDoc).toHaveBeenCalledWith(expect.anything());
    });

    it('should support transaction parameter', async () => {
      const mockFirestoreTransaction = {
        delete: vi.fn(),
      };

      await projectTransactionRepository.delete(
        householdId,
        'trans-1',
        mockFirestoreTransaction as unknown as FirestoreTransaction,
      );

      expect(mockFirestoreTransaction.delete).toHaveBeenCalled();
      expect(deleteDoc).not.toHaveBeenCalled();
    });
  });

  describe('deleteMultiple', () => {
    it('should delete multiple project transactions', async () => {
      await projectTransactionRepository.deleteMultiple(householdId, ['trans-1', 'trans-2']);

      expect(deleteDoc).toHaveBeenCalledTimes(2);
    });

    it('should handle empty array', async () => {
      await projectTransactionRepository.deleteMultiple(householdId, []);

      expect(deleteDoc).not.toHaveBeenCalled();
    });

    it('should support transaction parameter', async () => {
      const mockFirestoreTransaction = {
        delete: vi.fn(),
      };

      await projectTransactionRepository.deleteMultiple(
        householdId,
        ['trans-1', 'trans-2'],
        mockFirestoreTransaction as unknown as FirestoreTransaction,
      );

      expect(mockFirestoreTransaction.delete).toHaveBeenCalledTimes(2);
      expect(deleteDoc).not.toHaveBeenCalled();
    });
  });

  describe('getDocRefForTransaction', () => {
    it('should return a new doc ref when no ID provided', () => {
      const mockDocRef = { id: 'new-doc-id' } as DocumentReference;
      vi.mocked(doc).mockReturnValue(mockDocRef);

      const ref = projectTransactionRepository.getDocRefForTransaction(householdId);

      expect(ref).toBeDefined();
    });

    it('should return a specific doc ref when ID provided', () => {
      const ref = projectTransactionRepository.getDocRefForTransaction(householdId, 'trans-1');

      expect(ref).toBeDefined();
    });
  });
});
