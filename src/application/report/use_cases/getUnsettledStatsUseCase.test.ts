import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { type AuthContext } from '@/application/types';
import { type Account } from '@/domains/account/types/account';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type Portfolio } from '@/domains/portfolio/types/portfolio';
import { type Project } from '@/domains/project/schemas';

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

vi.mock('@/application/debt/use_cases/listDebtAccountsUseCase', () => ({
  listDebtAccountsUseCase: { execute: vi.fn() },
}));

vi.mock('@/infra/repositories/debtSnapshotRepository', () => ({
  debtSnapshotRepository: { getSnapshot: vi.fn() },
}));

vi.mock('@/application/project/use_cases/listProjectsUseCase', () => ({
  listProjectsUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/project/use_cases/listProjectSnapshotsUseCase', () => ({
  listProjectSnapshotsUseCase: { execute: vi.fn() },
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

const createProject = (id: string, isActive: boolean): Project => ({
  id,
  name: `Project ${id}`,
  description: `${id} description`,
  isActive,
  type: 'EVENT',
  order: 0,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

const createDebt = (id: string, isActive: boolean): DebtAccount =>
  ({
    id,
    name: `Debt ${id}`,
    isActive,
  }) as DebtAccount;

describe('getUnsettledStatsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('returns unsettled accounts, active unsettled portfolios, active unsettled debts, and active unsettled projects for the specified period', async () => {
    const account1 = createAccount('a1');
    const account2 = createAccount('a2');
    const portfolio1 = createPortfolio('p1', true);
    const portfolio2 = createPortfolio('p2', false);
    const portfolio3 = createPortfolio('p3', true);
    const debt1 = createDebt('d1', true);
    const debt2 = createDebt('d2', false);
    const debt3 = createDebt('d3', true);
    const project1 = createProject('pr1', true);
    const project2 = createProject('pr2', false);
    const project3 = createProject('pr3', true);

    const { listProjectsUseCase } = await import(
      '@/application/project/use_cases/listProjectsUseCase'
    );
    const { listProjectSnapshotsUseCase } = await import(
      '@/application/project/use_cases/listProjectSnapshotsUseCase'
    );
    const { listDebtAccountsUseCase } = await import(
      '@/application/debt/use_cases/listDebtAccountsUseCase'
    );
    const { debtSnapshotRepository } = await import('@/infra/repositories/debtSnapshotRepository');

    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([account1, account2]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([
      portfolio1,
      portfolio2,
      portfolio3,
    ]);
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([debt1, debt2, debt3]);
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([project1, project2, project3]);

    vi.mocked(getAccountSnapshotsUseCase.execute).mockImplementation(
      async ({ accountId }: { accountId: string }) => {
        if (accountId === 'a1') return [{ id: 'snap-a1' } as never];
        return [];
      },
    );

    vi.mocked(listPortfolioSnapshotsUseCase.execute).mockImplementation(
      async ({ portfolioId }: { portfolioId: string }) => {
        if (portfolioId === 'p3') return [{ id: 'snap-p3' } as never];
        return [];
      },
    );

    vi.mocked(debtSnapshotRepository.getSnapshot).mockImplementation(
      async (_householdId: string, debtId: string) => {
        if (debtId === 'd3') return { id: 'snap-d3' } as never;
        return null;
      },
    );

    vi.mocked(listProjectSnapshotsUseCase.execute).mockImplementation(
      async ({ projectId }: { projectId: string }) => {
        if (projectId === 'pr3') return [{ id: 'snap-pr3' } as never];
        return [];
      },
    );

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
    expect(result.unsettledDebts.map((d) => d.id)).toEqual(['d1']);
    expect(result.unsettledProjects.map((p) => p.id)).toEqual(['pr1']);
    expect(result.totalUnsettled).toBe(4);

    expect(getAccountSnapshotsUseCase.execute).toHaveBeenCalledTimes(2);
    expect(listPortfolioSnapshotsUseCase.execute).toHaveBeenCalledTimes(2);
    expect(debtSnapshotRepository.getSnapshot).toHaveBeenCalledTimes(2);
    expect(listProjectSnapshotsUseCase.execute).toHaveBeenCalledTimes(2);
    expect(listPortfolioSnapshotsUseCase.execute).not.toHaveBeenCalledWith(
      expect.objectContaining({ portfolioId: 'p2' }),
    );
    expect(listProjectSnapshotsUseCase.execute).not.toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'pr2' }),
    );
    expect(debtSnapshotRepository.getSnapshot).not.toHaveBeenCalledWith(
      expect.anything(),
      'd2',
      expect.anything(),
    );
  });

  it('uses current year and month when period is not provided', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T08:00:00.000Z'));

    const account = createAccount('a1');
    const portfolio = createPortfolio('p1', true);
    const debt = createDebt('d1', true);
    const project = createProject('pr1', true);

    const { listProjectsUseCase } = await import(
      '@/application/project/use_cases/listProjectsUseCase'
    );
    const { listProjectSnapshotsUseCase } = await import(
      '@/application/project/use_cases/listProjectSnapshotsUseCase'
    );
    const { listDebtAccountsUseCase } = await import(
      '@/application/debt/use_cases/listDebtAccountsUseCase'
    );
    const { debtSnapshotRepository } = await import('@/infra/repositories/debtSnapshotRepository');

    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([account]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([portfolio]);
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([debt]);
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([project]);
    vi.mocked(getAccountSnapshotsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listPortfolioSnapshotsUseCase.execute).mockResolvedValue([]);
    vi.mocked(debtSnapshotRepository.getSnapshot).mockResolvedValue(null);
    vi.mocked(listProjectSnapshotsUseCase.execute).mockResolvedValue([]);

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
    expect(debtSnapshotRepository.getSnapshot).toHaveBeenCalledWith('household-1', 'd1', '2026-03');
    expect(listProjectSnapshotsUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ yearMonth: '2026-03' }),
    );
  });

  it('returns empty unsettled result when there are no accounts, portfolios, debts, or projects', async () => {
    const { listProjectsUseCase } = await import(
      '@/application/project/use_cases/listProjectsUseCase'
    );
    const { listDebtAccountsUseCase } = await import(
      '@/application/debt/use_cases/listDebtAccountsUseCase'
    );
    const { debtSnapshotRepository } = await import('@/infra/repositories/debtSnapshotRepository');

    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([]);
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([]);

    const result = await getUnsettledStatsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.unsettledAccounts).toEqual([]);
    expect(result.unsettledPortfolios).toEqual([]);
    expect(result.unsettledDebts).toEqual([]);
    expect(result.unsettledProjects).toEqual([]);
    expect(result.totalUnsettled).toBe(0);
    expect(getAccountSnapshotsUseCase.execute).not.toHaveBeenCalled();
    expect(listPortfolioSnapshotsUseCase.execute).not.toHaveBeenCalled();
    expect(debtSnapshotRepository.getSnapshot).not.toHaveBeenCalled();
    const { listProjectSnapshotsUseCase } = await import(
      '@/application/project/use_cases/listProjectSnapshotsUseCase'
    );
    expect(listProjectSnapshotsUseCase.execute).not.toHaveBeenCalled();
  });
});
