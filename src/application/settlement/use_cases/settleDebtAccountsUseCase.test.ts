import { beforeEach, describe, expect, it, vi } from 'vitest';

import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';

import { settleDebtAccountsUseCase } from './settleDebtAccountsUseCase';

vi.mock('@/infra/repositories/debtAccountRepository', () => ({
  debtAccountRepository: { getDebtAccounts: vi.fn() },
}));

vi.mock('@/infra/repositories/debtSnapshotRepository', () => ({
  debtSnapshotRepository: {
    getSnapshot: vi.fn(),
    create: vi.fn(),
    upsertSnapshot: vi.fn(),
  },
}));

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn().mockResolvedValue(undefined),
    assertWritePermission: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('settleDebtAccountsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([]);
    vi.mocked(debtSnapshotRepository.getSnapshot).mockResolvedValue(null);
    vi.mocked(debtSnapshotRepository.create).mockResolvedValue('' as never);
  });

  it('does not call upsertSnapshot (which re-reads); uses create directly', async () => {
    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([
      { id: 'debt-1', currentBalance: 100000 } as never,
    ]);

    await settleDebtAccountsUseCase.execute({
      householdId: 'household-1',
      yearMonth: '2026-03',
      userEmail: 'user@example.com',
      auth: { uid: 'user-1', isGlobalAdmin: false },
    });

    expect(debtSnapshotRepository.getSnapshot).toHaveBeenCalledTimes(1);
    expect(debtSnapshotRepository.create).toHaveBeenCalledTimes(1);
    expect(debtSnapshotRepository.upsertSnapshot).not.toHaveBeenCalled();
  });

  it('skips debts that already have snapshots', async () => {
    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([
      { id: 'debt-1', currentBalance: 100000 } as never,
    ]);
    vi.mocked(debtSnapshotRepository.getSnapshot).mockResolvedValue({
      yearMonth: '2026-03',
      closingBalance: 90000,
    } as never);

    await settleDebtAccountsUseCase.execute({
      householdId: 'household-1',
      yearMonth: '2026-03',
      userEmail: 'user@example.com',
      auth: { uid: 'user-1', isGlobalAdmin: false },
    });

    expect(debtSnapshotRepository.create).not.toHaveBeenCalled();
  });

  it('creates initial snapshot with zero payments and current balance', async () => {
    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([
      { id: 'debt-1', currentBalance: 500000 } as never,
    ]);

    await settleDebtAccountsUseCase.execute({
      householdId: 'household-1',
      yearMonth: '2026-03',
      userEmail: 'user@example.com',
      auth: { uid: 'user-1', isGlobalAdmin: false },
    });

    const call = vi.mocked(debtSnapshotRepository.create).mock.calls[0];
    expect(call[0]).toEqual(['household-1', 'debt-1']);
    expect(call[1]).toMatchObject({
      yearMonth: '2026-03',
      openingBalance: 500000,
      principalPaid: 0,
      interestPaid: 0,
      totalPaid: 0,
      closingBalance: 500000,
    });
    expect(call[4]).toBe('2026-03');
  });
});
