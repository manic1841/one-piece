import { describe, it, expect, vi, beforeEach } from 'vitest';
import { plannedIncomeRepository } from './plannedIncomeRepository';
import {
  Timestamp,
  QuerySnapshot,
  type DocumentReference,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { getDoc, getDocs, setDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';

describe('plannedIncomeRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new planned income and return the ID', async () => {
      const newPlannedIncome = {
        date: new Date('2024-01-01'),
        amount: 5000,
        category: 'salary' as const,
        description: 'Monthly salary',
        createdBy: 'user-1',
        allocations: [
          { projectId: 'project-1', percentage: 50 },
          { projectId: 'project-2', percentage: 50 },
        ],
      };

      const mockDocRef = { id: 'new-planned-income-id' } as DocumentReference;
      vi.mocked(doc).mockReturnValue(mockDocRef);

      const id = await plannedIncomeRepository.create('household-1', newPlannedIncome);

      expect(id).toBe('new-planned-income-id');
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          amount: 5000,
          category: 'salary',
          id: 'new-planned-income-id',
        }),
      );
    });
  });

  describe('getById', () => {
    it('should return planned income when it exists', async () => {
      const mockPlannedIncome = {
        id: 'planned-income-1',
        date: new Timestamp(1704067200, 0),
        amount: 5000,
        category: 'salary',
        description: 'Monthly salary',
        createdBy: 'user-1',
        createdAt: new Timestamp(1704067200, 0),
        allocations: [
          { projectId: 'project-1', percentage: 50 },
          { projectId: 'project-2', percentage: 50 },
        ],
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockPlannedIncome,
        id: 'planned-income-1',
        ref: {} as unknown,
        metadata: {} as unknown,
      } as unknown as DocumentSnapshot);

      const result = await plannedIncomeRepository.getById('household-1', 'planned-income-1');

      expect(result).toBeTruthy();
      expect(result?.amount).toBe(5000);
      expect(result?.category).toBe('salary');
    });

    it('should return null when planned income does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => undefined,
        id: 'non-existent',
        ref: {} as unknown,
        metadata: {} as unknown,
      } as unknown as DocumentSnapshot);

      const result = await plannedIncomeRepository.getById('household-1', 'non-existent');

      expect(result).toBe(null);
    });
  });

  describe('getAll', () => {
    it('should return all planned incomes', async () => {
      const mockPlannedIncomes = [
        {
          id: 'pi-1',
          date: new Timestamp(1704067200, 0),
          amount: 5000,
          category: 'salary',
          createdBy: 'user-1',
          createdAt: new Timestamp(1704067200, 0),
          allocations: [],
        },
        {
          id: 'pi-2',
          date: new Timestamp(1706745600, 0),
          amount: 3000,
          category: 'bonus',
          createdBy: 'user-1',
          createdAt: new Timestamp(1706745600, 0),
          allocations: [],
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockPlannedIncomes.map((pi) => ({
          data: () => pi,
        })),
      } as never);

      const result = await plannedIncomeRepository.getAll('household-1');

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(5000);
      expect(result[1].amount).toBe(3000);
    });

    it('should return filtered planned incomes with query constraints', async () => {
      const mockPlannedIncomes = [
        {
          id: 'pi-1',
          date: new Timestamp(1704067200, 0),
          amount: 5000,
          category: 'salary',
          createdBy: 'user-1',
          createdAt: new Timestamp(1704067200, 0),
          allocations: [],
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockPlannedIncomes.map((pi) => ({
          id: pi.id,
          data: () => pi,
        })),
      } as unknown as QuerySnapshot);

      const result = await plannedIncomeRepository.getAll('household-1', [
        where('category', '==', 'salary'),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('salary');
    });
  });

  describe('update', () => {
    it('should update a planned income', async () => {
      await plannedIncomeRepository.update('household-1', 'pi-1', {
        amount: 6000,
        description: 'Updated salary',
      });

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          amount: 6000,
          description: 'Updated salary',
        }),
      );
    });

    it('should convert Date to Timestamp when updating', async () => {
      const newDate = new Date('2024-02-01');
      await plannedIncomeRepository.update('household-1', 'pi-1', {
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
    it('should delete a planned income', async () => {
      await plannedIncomeRepository.delete('household-1', 'pi-1');

      expect(deleteDoc).toHaveBeenCalledWith(expect.anything());
    });
  });

  describe('getDocRefForTransaction', () => {
    it('should return a new doc ref when no ID provided', () => {
      const ref = plannedIncomeRepository.getDocRefForTransaction('household-1');

      expect(ref).toBeDefined();
      expect(ref.id).toBe('new-planned-income-id');
    });

    it('should return a specific doc ref when ID provided', () => {
      const ref = plannedIncomeRepository.getDocRefForTransaction('household-1', 'pi-1');

      expect(ref).toBeDefined();
      expect(ref.id).toBe('pi-1');
    });
  });
});
