import { describe, it, expect, vi, beforeEach } from 'vitest';
import { portfolioRepository } from './portfolioRepository';
import {
  Timestamp,
  QuerySnapshot,
  type DocumentReference,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { getDoc, getDocs, setDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

describe('portfolioRepository', () => {
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new portfolio and return the ID', async () => {
      const newPortfolio = {
        name: 'My Portfolio',
        accountIds: ['acc-1', 'acc-2'],
        isActive: true,
      };

      const mockDocRef = { id: 'new-portfolio-id' } as DocumentReference;
      vi.mocked(doc).mockReturnValue(mockDocRef);

      const id = await portfolioRepository.create(householdId, newPortfolio);

      expect(id).toBe('new-portfolio-id');
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'My Portfolio',
          id: 'new-portfolio-id',
        }),
      );
    });
  });

  describe('getById', () => {
    it('should return portfolio when it exists', async () => {
      const mockPortfolio = {
        id: 'portfolio-1',
        name: 'My Portfolio',
        accountIds: ['acc-1'],
        isActive: true,
        createdAt: new Timestamp(1704067200, 0),
        updatedAt: new Timestamp(1704067200, 0),
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockPortfolio,
        id: 'portfolio-1',
        ref: {} as unknown,
        metadata: {} as unknown,
      } as unknown as DocumentSnapshot);

      const result = await portfolioRepository.getById(householdId, 'portfolio-1');

      expect(result).toBeTruthy();
      expect(result?.name).toBe('My Portfolio');
    });

    it('should return null when portfolio does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => undefined,
        id: 'non-existent',
        ref: {} as unknown,
        metadata: {} as unknown,
      } as unknown as DocumentSnapshot);

      const result = await portfolioRepository.getById(householdId, 'non-existent');

      expect(result).toBe(null);
    });
  });

  describe('getAll', () => {
    it('should return all portfolios', async () => {
      const mockPortfolios = [
        {
          id: 'p1',
          name: 'P1',
          accountIds: [],
          isActive: true,
          createdAt: new Timestamp(1704067200, 0),
        },
        {
          id: 'p2',
          name: 'P2',
          accountIds: [],
          isActive: true,
          createdAt: new Timestamp(1706745600, 0),
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockPortfolios.map((p) => ({
          id: p.id,
          data: () => p,
        })),
      } as unknown as QuerySnapshot);

      const result = await portfolioRepository.getAll(householdId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('P1');
    });
  });

  describe('update', () => {
    it('should update a portfolio', async () => {
      await portfolioRepository.update(householdId, 'p1', {
        name: 'Updated Name',
      });

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Updated Name',
        }),
      );
    });
  });

  describe('delete', () => {
    it('should delete a portfolio', async () => {
      await portfolioRepository.delete(householdId, 'p1');

      expect(deleteDoc).toHaveBeenCalledWith(expect.anything());
    });
  });

  describe('createSnapshot', () => {
    it('should create a snapshot', async () => {
      const snapshotData = {
        year: 2024,
        month: 1,
        accounts: [],
        totalValue: 10000,
        cashFlow: { deposits: 100, withdrawals: 0 },
        performance: {
          openingValue: 9000,
          closingValue: 10000,
          netCashFlow: 100,
          gain: 900,
          returnRate: 0.1,
          cumulativeGain: 900,
          cumulativeReturnRate: 0.1,
        },
        createdBy: 'user-1',
      };

      const mockDocRef = { id: 'snap-1' } as DocumentReference;
      vi.mocked(doc).mockReturnValue(mockDocRef);

      const id = await portfolioRepository.createSnapshot(householdId, 'p1', snapshotData);

      expect(id).toBe('snap-1');
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'snap-1',
          year: 2024,
          totalValue: 10000,
        }),
      );
    });
  });

  describe('getSnapshots', () => {
    it('should return snapshots', async () => {
      const mockSnapshots = [
        {
          id: 's1',
          year: 2024,
          month: 1,
          accounts: [],
          totalValue: 10000,
          cashFlow: { deposits: 0, withdrawals: 0 },
          performance: {
            openingValue: 0,
            closingValue: 0,
            netCashFlow: 0,
            gain: 0,
            returnRate: 0,
            cumulativeGain: 0,
            cumulativeReturnRate: 0,
          },
          createdAt: new Timestamp(1704067200, 0),
          createdBy: 'user-1',
        },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockSnapshots.map((s) => ({
          id: s.id,
          data: () => s,
        })),
      } as unknown as QuerySnapshot);

      const result = await portfolioRepository.getSnapshots(householdId, 'p1');

      expect(result).toHaveLength(1);
      expect(result[0].totalValue).toBe(10000);
    });
  });
});
