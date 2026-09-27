import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { type AuthContext } from '@/application/types';
import { type Account } from '@/domains/account/types/account';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type Portfolio } from '@/domains/portfolio/types/portfolio';
import { type Project } from '@/domains/project/schemas';
import { accountSnapshotRepository } from '@/infra/repositories/accountSnapshotRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';

import { getSettlementReadinessUseCase } from './getSettlementReadinessUseCase';

vi.mock('@/application/account/use_cases/getAccountsUseCase', () => ({
  getAccountsUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/portfolio/use_cases/listPortfoliosUseCase', () => ({
  listPortfoliosUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/debt/use_cases/listDebtAccountsUseCase', () => ({
  listDebtAccountsUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/project/use_cases/listProjectsUseCase', () => ({
  listProjectsUseCase: { execute: vi.fn() },
}));

vi.mock('@/infra/repositories/accountSnapshotRepository', () => ({
  accountSnapshotRepository: { getSnapshot: vi.fn() },
}));

vi.mock('@/infra/repositories/portfolioSnapshotRepository', () => ({
  portfolioSnapshotRepository: { getSnapshot: vi.fn() },
}));

vi.mock('@/infra/repositories/debtSnapshotRepository', () => ({
  debtSnapshotRepository: { getSnapshot: vi.fn() },
}));

vi.mock('@/infra/repositories/projectSnapshotRepository', () => ({
  projectSnapshotRepository: { getSnapshot: vi.fn() },
}));

const auth: AuthContext = {
  uid: 'user-1',
  email: 'u1@example.com',
  isGlobalAdmin: false,
};

const createAccount = (id: string, isActive = true): Account => ({
  id,
  name: `Account ${id}`,
  category: 'cash',
  currency: 'TWD',
  order: 0,
  isActive,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

const createPortfolio = (id: string, isActive: boolean): Portfolio => ({
  id,
  name: `Portfolio ${id}`,
  securitiesAccountId: 'acc-1',
  bankAccountId: 'acc-2',
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

describe('getSettlementReadinessUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('returns unsettled active entities and isReady=false when snapshots are missing', async () => {
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

    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([account1, account2]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([
      portfolio1,
      portfolio2,
      portfolio3,
    ]);
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([debt1, debt2, debt3]);
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([project1, project2, project3]);

    vi.mocked(accountSnapshotRepository.getSnapshot).mockImplementation(
      async (_hid: string, accountId: string) => {
        if (accountId === 'a1') return { id: 'snap-a1' } as never;
        return null;
      },
    );

    vi.mocked(portfolioSnapshotRepository.getSnapshot).mockImplementation(
      async (_hid: string, portfolioId: string) => {
        if (portfolioId === 'p3') return { id: 'snap-p3' } as never;
        return null;
      },
    );

    vi.mocked(debtSnapshotRepository.getSnapshot).mockImplementation(
      async (_householdId: string, debtId: string) => {
        if (debtId === 'd3') return { id: 'snap-d3' } as never;
        return null;
      },
    );

    vi.mocked(projectSnapshotRepository.getSnapshot).mockImplementation(
      async (_hid: string, projectId: string) => {
        if (projectId === 'pr3') return { id: 'snap-pr3' } as never;
        return null;
      },
    );

    const result = await getSettlementReadinessUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.year).toBe(2026);
    expect(result.month).toBe(3);
    expect(result.isReady).toBe(false);
    expect(result.unsettledAccounts.map((a) => a.id)).toEqual(['a2']);
    expect(result.unsettledPortfolios.map((p) => p.id)).toEqual(['p1']);
    expect(result.unsettledDebts.map((d) => d.id)).toEqual(['d1']);
    expect(result.unsettledProjects.map((p) => p.id)).toEqual(['pr1']);
    expect(result.totalUnsettled).toBe(4);

    expect(accountSnapshotRepository.getSnapshot).toHaveBeenCalledTimes(2);
    expect(portfolioSnapshotRepository.getSnapshot).toHaveBeenCalledTimes(2);
    expect(debtSnapshotRepository.getSnapshot).toHaveBeenCalledTimes(2);
    expect(projectSnapshotRepository.getSnapshot).toHaveBeenCalledTimes(2);
    expect(portfolioSnapshotRepository.getSnapshot).not.toHaveBeenCalledWith(
      expect.anything(),
      'p2',
      expect.anything(),
    );
    expect(projectSnapshotRepository.getSnapshot).not.toHaveBeenCalledWith(
      expect.anything(),
      'pr2',
      expect.anything(),
    );
    expect(debtSnapshotRepository.getSnapshot).not.toHaveBeenCalledWith(
      expect.anything(),
      'd2',
      expect.anything(),
    );
  });

  it('uses deterministic point reads with YYYY-MM document IDs', async () => {
    const account1 = createAccount('a1');
    const portfolio1 = createPortfolio('p1', true);
    const debt1 = createDebt('d1', true);
    const project1 = createProject('pr1', true);

    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([account1]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([portfolio1]);
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([debt1]);
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([project1]);
    vi.mocked(accountSnapshotRepository.getSnapshot).mockResolvedValue({ id: 'snap-a1' } as never);
    vi.mocked(portfolioSnapshotRepository.getSnapshot).mockResolvedValue({
      id: 'snap-p1',
    } as never);
    vi.mocked(debtSnapshotRepository.getSnapshot).mockResolvedValue({ id: 'snap-d1' } as never);
    vi.mocked(projectSnapshotRepository.getSnapshot).mockResolvedValue({
      id: 'snap-pr1',
    } as never);

    await getSettlementReadinessUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(accountSnapshotRepository.getSnapshot).toHaveBeenCalledWith(
      'household-1',
      'a1',
      '2026-03',
    );
    expect(portfolioSnapshotRepository.getSnapshot).toHaveBeenCalledWith(
      'household-1',
      'p1',
      '2026-03',
    );
    expect(debtSnapshotRepository.getSnapshot).toHaveBeenCalledWith('household-1', 'd1', '2026-03');
    expect(projectSnapshotRepository.getSnapshot).toHaveBeenCalledWith(
      'household-1',
      'pr1',
      '2026-03',
    );
  });

  it('returns isReady=true when all active entities have snapshots', async () => {
    const account1 = createAccount('a1');
    const portfolio1 = createPortfolio('p1', true);
    const debt1 = createDebt('d1', true);
    const project1 = createProject('pr1', true);

    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([account1]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([portfolio1]);
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([debt1]);
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([project1]);
    vi.mocked(accountSnapshotRepository.getSnapshot).mockResolvedValue({ id: 'snap-a1' } as never);
    vi.mocked(portfolioSnapshotRepository.getSnapshot).mockResolvedValue({
      id: 'snap-p1',
    } as never);
    vi.mocked(debtSnapshotRepository.getSnapshot).mockResolvedValue({ id: 'snap-d1' } as never);
    vi.mocked(projectSnapshotRepository.getSnapshot).mockResolvedValue({
      id: 'snap-pr1',
    } as never);

    const result = await getSettlementReadinessUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.isReady).toBe(true);
    expect(result.totalUnsettled).toBe(0);
    expect(result.unsettledAccounts).toEqual([]);
    expect(result.unsettledPortfolios).toEqual([]);
    expect(result.unsettledDebts).toEqual([]);
    expect(result.unsettledProjects).toEqual([]);
  });

  it('filters inactive accounts so they do not produce false unsettled results', async () => {
    const activeAccount = createAccount('a1', true);
    const inactiveAccount = createAccount('a2', false);

    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([activeAccount, inactiveAccount]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([]);
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([]);
    vi.mocked(accountSnapshotRepository.getSnapshot).mockResolvedValue({
      id: 'snap-a1',
    } as never);

    const result = await getSettlementReadinessUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.isReady).toBe(true);
    expect(result.unsettledAccounts).toEqual([]);
    expect(accountSnapshotRepository.getSnapshot).toHaveBeenCalledTimes(1);
    expect(accountSnapshotRepository.getSnapshot).toHaveBeenCalledWith(
      'household-1',
      'a1',
      '2026-03',
    );
    expect(accountSnapshotRepository.getSnapshot).not.toHaveBeenCalledWith(
      expect.anything(),
      'a2',
      expect.anything(),
    );
  });

  it('returns isReady=false when only accounts are unsettled', async () => {
    const account1 = createAccount('a1');

    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([account1]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([]);
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([]);
    vi.mocked(accountSnapshotRepository.getSnapshot).mockResolvedValue(null);

    const result = await getSettlementReadinessUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.isReady).toBe(false);
    expect(result.unsettledAccounts.map((a) => a.id)).toEqual(['a1']);
    expect(result.totalUnsettled).toBe(1);
  });

  it('returns isReady=false when only portfolios are unsettled', async () => {
    const portfolio1 = createPortfolio('p1', true);

    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([portfolio1]);
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([]);
    vi.mocked(portfolioSnapshotRepository.getSnapshot).mockResolvedValue(null);

    const result = await getSettlementReadinessUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.isReady).toBe(false);
    expect(result.unsettledPortfolios.map((p) => p.id)).toEqual(['p1']);
  });

  it('returns isReady=false when only debts are unsettled', async () => {
    const debt1 = createDebt('d1', true);

    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([]);
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([debt1]);
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([]);
    vi.mocked(debtSnapshotRepository.getSnapshot).mockResolvedValue(null);

    const result = await getSettlementReadinessUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.isReady).toBe(false);
    expect(result.unsettledDebts.map((d) => d.id)).toEqual(['d1']);
  });

  it('returns isReady=false when only projects are unsettled', async () => {
    const project1 = createProject('pr1', true);

    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([]);
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([project1]);
    vi.mocked(projectSnapshotRepository.getSnapshot).mockResolvedValue(null);

    const result = await getSettlementReadinessUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.isReady).toBe(false);
    expect(result.unsettledProjects.map((p) => p.id)).toEqual(['pr1']);
  });

  it('uses current year and month when period is not provided', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T08:00:00.000Z'));

    const account = createAccount('a1');
    const portfolio = createPortfolio('p1', true);
    const debt = createDebt('d1', true);
    const project = createProject('pr1', true);

    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([account]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([portfolio]);
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([debt]);
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([project]);
    vi.mocked(accountSnapshotRepository.getSnapshot).mockResolvedValue(null);
    vi.mocked(portfolioSnapshotRepository.getSnapshot).mockResolvedValue(null);
    vi.mocked(debtSnapshotRepository.getSnapshot).mockResolvedValue(null);
    vi.mocked(projectSnapshotRepository.getSnapshot).mockResolvedValue(null);

    await getSettlementReadinessUseCase.execute({
      householdId: 'household-1',
      auth,
    });

    expect(accountSnapshotRepository.getSnapshot).toHaveBeenCalledWith(
      'household-1',
      'a1',
      '2026-03',
    );
    expect(portfolioSnapshotRepository.getSnapshot).toHaveBeenCalledWith(
      'household-1',
      'p1',
      '2026-03',
    );
    expect(debtSnapshotRepository.getSnapshot).toHaveBeenCalledWith('household-1', 'd1', '2026-03');
    expect(projectSnapshotRepository.getSnapshot).toHaveBeenCalledWith(
      'household-1',
      'pr1',
      '2026-03',
    );
  });

  it('returns isReady=true with empty unsettled result when there are no entities', async () => {
    vi.mocked(getAccountsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listPortfoliosUseCase.execute).mockResolvedValue([]);
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([]);
    vi.mocked(listProjectsUseCase.execute).mockResolvedValue([]);

    const result = await getSettlementReadinessUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.isReady).toBe(true);
    expect(result.unsettledAccounts).toEqual([]);
    expect(result.unsettledPortfolios).toEqual([]);
    expect(result.unsettledDebts).toEqual([]);
    expect(result.unsettledProjects).toEqual([]);
    expect(result.totalUnsettled).toBe(0);
    expect(accountSnapshotRepository.getSnapshot).not.toHaveBeenCalled();
    expect(portfolioSnapshotRepository.getSnapshot).not.toHaveBeenCalled();
    expect(debtSnapshotRepository.getSnapshot).not.toHaveBeenCalled();
    expect(projectSnapshotRepository.getSnapshot).not.toHaveBeenCalled();
  });
});
