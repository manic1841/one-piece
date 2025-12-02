import { describe, it, expect, vi, beforeEach } from 'vitest';
import { householdRepository } from './householdRepository';
import {
  Timestamp,
  QuerySnapshot,
  type DocumentReference,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { getDoc, getDocs, setDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';

describe('householdRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new household and return the ID', async () => {
      const newHousehold = {
        name: 'Test Household',
        members: {
          'user-1': {
            role: 'owner' as const,
            joinedAt: Timestamp.now(),
          },
        },
      };

      const mockDocRef = { id: 'new-household-id' } as DocumentReference;
      vi.mocked(doc).mockReturnValue(mockDocRef);

      const id = await householdRepository.create(newHousehold);

      expect(id).toBe('new-household-id');
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Test Household',
          id: 'new-household-id',
        }),
      );
    });
  });

  describe('getById', () => {
    it('should return household when it exists', async () => {
      const mockHousehold = {
        id: 'household-1',
        name: 'Test Household',
        members: {
          'user-1': {
            role: 'owner' as const,
            joinedAt: new Timestamp(1234567890, 0),
          },
        },
        createdAt: new Timestamp(1234567890, 0),
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockHousehold,
        id: 'household-1',
        ref: {} as unknown,
        metadata: {} as unknown,
      } as unknown as DocumentSnapshot);

      const result = await householdRepository.getById('household-1');

      expect(result).toBeTruthy();
      expect(result?.name).toBe('Test Household');
    });

    it('should return null when household does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => undefined,
        id: 'non-existent',
        ref: {} as unknown,
        metadata: {} as unknown,
      } as unknown as DocumentSnapshot);

      const result = await householdRepository.getById('non-existent');

      expect(result).toBe(null);
    });
  });

  describe('getAll', () => {
    it('should return all households', async () => {
      const mockHouseholds = [
        {
          id: 'household-1',
          name: 'Household 1',
          members: {},
          createdAt: new Timestamp(1234567890, 0),
        },
        {
          id: 'household-2',
          name: 'Household 2',
          members: {},
          createdAt: new Timestamp(1234567890, 0),
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockHouseholds.map((household) => ({
          data: () => household,
        })),
      } as never);

      const result = await householdRepository.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Household 1');
      expect(result[1].name).toBe('Household 2');
    });

    it('should return filtered households when query constraints provided', async () => {
      const mockHouseholds = [
        {
          id: 'household-1',
          name: 'Test Household',
          members: {},
          createdAt: new Timestamp(1234567890, 0),
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockHouseholds.map((household) => ({
          id: household.id,
          data: () => household,
        })),
      } as unknown as QuerySnapshot);

      const result = await householdRepository.getAll([where('name', '==', 'Test')]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Household');
    });
  });

  describe('update', () => {
    it('should update a household', async () => {
      await householdRepository.update('household-1', {
        name: 'Updated Name',
      });

      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
        name: 'Updated Name',
      });
    });
  });

  describe('delete', () => {
    it('should delete a household', async () => {
      await householdRepository.delete('household-1');

      expect(deleteDoc).toHaveBeenCalledWith(expect.anything());
    });
  });
});
