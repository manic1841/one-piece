import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type AuthContext } from '@/application/types';
import { accountRepository } from '@/infra/repositories/accountRepository';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';

import { previewFinancialReportsUseCase } from './previewFinancialReportsUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertReadPermission: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/infra/repositories/reportRepository', () => ({
  reportRepository: {
    getEntriesByMonth: vi.fn(),
    getEntriesUntilMonth: vi.fn(),
    getReport: vi.fn(),
    list: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/accountRepository', () => ({
  accountRepository: {
    getAccounts: vi.fn(),
    getSnapshot: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/portfolioRepository', () => ({
  portfolioRepository: { list: vi.fn() },
}));

vi.mock('@/infra/repositories/portfolioSnapshotRepository', () => ({
  portfolioSnapshotRepository: { getSnapshot: vi.fn() },
}));

vi.mock('@/infra/repositories/debtAccountRepository', () => ({
  debtAccountRepository: { getDebtAccounts: vi.fn() },
}));

vi.mock('@/infra/repositories/debtSnapshotRepository', () => ({
  debtSnapshotRepository: { getSnapshot: vi.fn() },
}));

const auth: AuthContext = {
  uid: 'user-1',
  email: 'u1@example.com',
  isGlobalAdmin: false,
};

const setupEmptyRepositories = () => {
  vi.mocked(reportRepository.getEntriesByMonth).mockResolvedValue([]);
  vi.mocked(reportRepository.getEntriesUntilMonth).mockResolvedValue([]);
  vi.mocked(reportRepository.getReport).mockResolvedValue(null);
  vi.mocked(reportRepository.list).mockResolvedValue([]);
  vi.mocked(accountRepository.getAccounts).mockResolvedValue([]);
  vi.mocked(accountRepository.getSnapshot).mockResolvedValue(null);
  vi.mocked(portfolioRepository.list).mockResolvedValue([]);
  vi.mocked(portfolioSnapshotRepository.getSnapshot).mockResolvedValue(null);
  vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([]);
  vi.mocked(debtSnapshotRepository.getSnapshot).mockResolvedValue(null);
};

describe('previewFinancialReportsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupEmptyRepositories();
  });

  it('checks read permission before any repository calls', async () => {
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );

    await previewFinancialReportsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(householdPermissionService.assertReadPermission).toHaveBeenCalledWith(
      'household-1',
      'user-1',
      false,
    );
  });

  it('returns computed reports with isPersisted=false when no stored reports exist', async () => {
    const result = await previewFinancialReportsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.incomeStatement.yearMonth).toBe('2026-03');
    expect(result.balanceSheet.yearMonth).toBe('2026-03');
    expect(result.cashFlow.yearMonth).toBe('2026-03');
    expect(result.isPersisted).toBe(false);
    expect(result.timestamps).toEqual({});
  });

  it('returns isPersisted=true with timestamps when all three reports exist', async () => {
    const ts = new Date('2026-03-15T10:30:00.000Z');
    vi.mocked(reportRepository.getReport).mockResolvedValue({ updatedAt: ts } as never);

    const result = await previewFinancialReportsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.isPersisted).toBe(true);
    expect(result.timestamps.incomeStatement).toBeDefined();
    expect(result.timestamps.balanceSheet).toBeDefined();
    expect(result.timestamps.cashFlow).toBeDefined();
  });

  it('returns isPersisted=false when only some reports exist', async () => {
    const ts = new Date('2026-03-15T10:30:00.000Z');
    vi.mocked(reportRepository.getReport)
      .mockResolvedValueOnce({ updatedAt: ts } as never)
      .mockResolvedValueOnce({ updatedAt: ts } as never)
      .mockResolvedValue(null); // third call returns null

    const result = await previewFinancialReportsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.isPersisted).toBe(false);
    expect(result.timestamps).toEqual({});
  });

  it('fetches entries, accounts, portfolios, and debts in parallel', async () => {
    await previewFinancialReportsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(reportRepository.getEntriesByMonth).toHaveBeenCalledWith('household-1', '2026-03');
    expect(reportRepository.getEntriesUntilMonth).toHaveBeenCalledWith('household-1', '2026-03');
    expect(accountRepository.getAccounts).toHaveBeenCalledWith('household-1');
    expect(portfolioRepository.list).toHaveBeenCalledWith(['household-1']);
    expect(debtAccountRepository.getDebtAccounts).toHaveBeenCalledWith('household-1');
  });

  it('computes income statement from monthly entries', async () => {
    vi.mocked(reportRepository.getEntriesByMonth).mockResolvedValue([
      { ledgerCode: 'income:salary', debit: 0, credit: 5000 },
      { ledgerCode: 'expense:food', debit: 800, credit: 0 },
    ]);

    const result = await previewFinancialReportsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.incomeStatement.incomeTotal).toBe(5000);
    expect(result.incomeStatement.expenseTotal).toBe(800);
    expect(result.incomeStatement.netIncome).toBe(4200);
  });

  it('computes balance sheet with account snapshots and debt snapshots', async () => {
    vi.mocked(accountRepository.getAccounts).mockResolvedValue([
      { id: 'acc-1', name: 'Cash', category: 'cash', isActive: true } as never,
    ]);
    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([
      { id: 'debt-1', name: 'Mortgage', isActive: true } as never,
    ]);
    vi.mocked(accountRepository.getSnapshot).mockResolvedValue({ amount: 10000 } as never);
    vi.mocked(debtSnapshotRepository.getSnapshot).mockResolvedValue({
      closingBalance: 3000,
    } as never);

    const result = await previewFinancialReportsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.balanceSheet.assets.groups.cash.total).toBe(10000);
    expect(result.balanceSheet.liabilities.total).toBe(3000);
    expect(result.balanceSheet.equity.total).toBe(7000);
  });

  it('filters inactive entities before fetching balance-sheet snapshots', async () => {
    vi.mocked(accountRepository.getAccounts).mockResolvedValue([
      { id: 'acc-active', name: 'Active', category: 'cash', isActive: true } as never,
      { id: 'acc-inactive', name: 'Inactive', category: 'cash', isActive: false } as never,
    ]);

    await previewFinancialReportsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    // Balance-sheet snapshot fetch is scoped to active accounts only
    expect(accountRepository.getSnapshot).toHaveBeenCalledWith(
      'household-1',
      'acc-active',
      '2026-03',
    );
  });

  it('passes labelResolver through to calculation functions', async () => {
    vi.mocked(reportRepository.getEntriesByMonth).mockResolvedValue([
      { ledgerCode: 'income:salary', debit: 0, credit: 1000 },
    ]);

    const resolver = (code: string) => `R:${code}`;

    const result = await previewFinancialReportsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
      labelResolver: resolver,
    });

    expect(result.incomeStatement.incomeItems[0].label).toBe('R:income:salary');
  });
});
