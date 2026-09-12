import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type AuthContext } from '@/application/types';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';

import { getStockGainLossUseCase } from './getStockGainLossUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertReadPermission: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/infra/repositories/portfolioRepository', () => ({
  portfolioRepository: { list: vi.fn() },
}));

vi.mock('@/infra/repositories/portfolioSnapshotRepository', () => ({
  portfolioSnapshotRepository: { getSnapshot: vi.fn(), list: vi.fn() },
}));

const auth: AuthContext = {
  uid: 'user-1',
  email: 'u1@example.com',
  isGlobalAdmin: false,
};

describe('getStockGainLossUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(portfolioRepository.list).mockResolvedValue([]);
    vi.mocked(portfolioSnapshotRepository.getSnapshot).mockResolvedValue(null);
  });

  it('uses point read (getSnapshot) with deterministic yearMonth ID, not a collection query', async () => {
    vi.mocked(portfolioRepository.list).mockResolvedValue([
      { id: 'port-1' } as never,
    ]);

    await getStockGainLossUseCase.execute({
      householdId: 'household-1',
      year: 2026,
      month: 3,
      auth,
    });

    expect(portfolioSnapshotRepository.getSnapshot).toHaveBeenCalledWith(
      'household-1',
      'port-1',
      '2026-03',
    );
    expect(portfolioSnapshotRepository.list).not.toHaveBeenCalled();
  });

  it('aggregates totalMarketValue and totalGainLoss across portfolios', async () => {
    vi.mocked(portfolioRepository.list).mockResolvedValue([
      { id: 'port-1' } as never,
      { id: 'port-2' } as never,
    ]);
    vi.mocked(portfolioSnapshotRepository.getSnapshot).mockImplementation(
      async (_h, portfolioId) => {
        if (portfolioId === 'port-1') {
          return { totalValue: 10000, performance: { cumulativeGain: 2000 } } as never;
        }
        return { totalValue: 5000, performance: { cumulativeGain: -500 } } as never;
      },
    );

    const result = await getStockGainLossUseCase.execute({
      householdId: 'household-1',
      year: 2026,
      month: 3,
      auth,
    });

    expect(result.totalMarketValue).toBe(15000);
    expect(result.totalGainLoss).toBe(1500);
    expect(result.totalCost).toBe(13500);
  });

  it('returns zeros when no snapshots exist', async () => {
    vi.mocked(portfolioRepository.list).mockResolvedValue([{ id: 'port-1' } as never]);

    const result = await getStockGainLossUseCase.execute({
      householdId: 'household-1',
      year: 2026,
      month: 3,
      auth,
    });

    expect(result.totalMarketValue).toBe(0);
    expect(result.totalGainLoss).toBe(0);
    expect(result.totalCost).toBe(0);
  });
});
