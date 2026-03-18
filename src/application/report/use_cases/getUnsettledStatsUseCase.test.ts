import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { type AuthContext } from '@/application/types';
import { type Account } from '@/domains/account/types/account';
import { type Portfolio } from '@/domains/portfolio/types/portfolio';

import { getUnsettledStatsUseCase } from './getUnsettledStatsUseCase';

vi.mock('@/application/account/use_cases/getAccountsUseCase', () => ({
  getAccountsUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/account/use_cases/getAccountSnapshotsUseCase', () => ({
  getAccountSnapshotsUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/portfolio/use_cases/listPortfoliosUseCase', () => ({
  listPortfoliosUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase', () => ({
  listPortfolioSnapshotsUseCase: { execute: vi.fn() },
}));

const auth: AuthContext = {
  uid: 'user-1',
  email: 'u1@example.com',
  isGlobalAdmin: false,
};

const createAccount = (id: string): Account => ({
  id,
  name: `Account ${id}`,
  category: 'cash',
  currency: 'TWD',
  order: 0,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

const createPortfolio = (id: string, isActive: boolean): Portfolio => ({
  id,
  name: `Portfolio ${id}`,
  description: `${id} description`,
  accountIds: [],
  isActive,
  order: 0,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

describe('getUnsettledStatsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('returns unsettled accounts and active unsettled portfolios for the specified period', async () => {
    const account1 = createAccount('a1');
    const account2 = createAccount('a2');
    const portfolio1 = createPortfolio('p1', true);
    const portfolio2 = createPortfolio('p2', false);
    const portfolio3 = createPortfolio('p3', true);

    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([account1, account2]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([
      portfolio1,
      portfolio2,
      portfolio3,
    ]);

    vi.mocked(getAccountSnapshotsUseCase.execute).mockImplementation(async ({ accountId }) => {
      if (accountId === 'a1') return [{ id: 'snap-a1' } as never];
      return [];
    });

    vi.mocked(listPortfolioSnapshotsUseCase.execute).mockImplementation(async ({ portfolioId }) => {
      if (portfolioId === 'p3') return [{ id: 'snap-p3' } as never];
      return [];
    });

    const result = await getUnsettledStatsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.year).toBe(2026);
    expect(result.month).toBe(3);
    expect(result.unsettledAccounts.map((a) => a.id)).toEqual(['a2']);
    expect(result.unsettledPortfolios.map((p) => p.id)).toEqual(['p1']);
    expect(result.totalUnsettled).toBe(2);

    expect(getAccountSnapshotsUseCase.execute).toHaveBeenCalledTimes(2);
    expect(listPortfolioSnapshotsUseCase.execute).toHaveBeenCalledTimes(2);
    expect(listPortfolioSnapshotsUseCase.execute).not.toHaveBeenCalledWith(
      expect.objectContaining({ portfolioId: 'p2' }),
    );
  });

  it('uses current year and month when period is not provided', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T08:00:00.000Z'));

    const account = createAccount('a1');
    const portfolio = createPortfolio('p1', true);

    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([account]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([portfolio]);
    vi.mocked(getAccountSnapshotsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listPortfolioSnapshotsUseCase.execute).mockResolvedValue([]);

    const result = await getUnsettledStatsUseCase.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result.year).toBe(2026);
    expect(result.month).toBe(3);
    expect(getAccountSnapshotsUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026, month: 3 }),
    );
    expect(listPortfolioSnapshotsUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026, month: 3 }),
    );
  });

  it('returns empty unsettled result when there are no accounts and no portfolios', async () => {
    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([]);

    const result = await getUnsettledStatsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.unsettledAccounts).toEqual([]);
    expect(result.unsettledPortfolios).toEqual([]);
    expect(result.totalUnsettled).toBe(0);
    expect(getAccountSnapshotsUseCase.execute).not.toHaveBeenCalled();
    expect(listPortfolioSnapshotsUseCase.execute).not.toHaveBeenCalled();
  });
});
