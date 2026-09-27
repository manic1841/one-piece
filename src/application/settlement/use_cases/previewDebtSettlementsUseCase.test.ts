import { beforeEach, describe, expect, it, vi } from 'vitest';

import { previewDebtSettlementsUseCase } from './previewDebtSettlementsUseCase';

vi.mock('@/infra/repositories/debtAccountRepository', () => ({
  debtAccountRepository: {
    getDebtAccounts: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/debtSnapshotRepository', () => ({
  debtSnapshotRepository: {
    getSnapshot: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: {
    listDebtPaymentsByDateRange: vi.fn(),
  },
}));

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn().mockResolvedValue(undefined),
    assertWritePermission: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('previewDebtSettlementsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('flags accounts without repayment records but still provides preview data', async () => {
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');
    const { debtSnapshotRepository } = await import('@/infra/repositories/debtSnapshotRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([
      { id: 'debt-1', name: 'Mortgage', currentBalance: 5000000 } as never,
      { id: 'debt-2', name: 'Car Loan', currentBalance: 300000 } as never,
    ]);

    vi.mocked(transactionRepository.listDebtPaymentsByDateRange).mockResolvedValue([
      { debtAccountId: 'debt-1', amount: 30000 } as never,
      { debtAccountId: 'debt-1', amount: 30000 } as never,
    ]);

    vi.mocked(debtSnapshotRepository.getSnapshot)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        yearMonth: '2026-03',
        openingBalance: 320000,
        principalPaid: 8000,
        interestPaid: 2000,
        totalPaid: 10000,
        closingBalance: 300000,
      } as never);
    // debt-1 has no current snapshot, so the previous month is read for its opening balance.
    vi.mocked(debtSnapshotRepository.getSnapshot).mockImplementation(async (...args) => {
      const yearMonth = args[2] as string | undefined;
      if (yearMonth === '2026-02')
        return { yearMonth: '2026-02', closingBalance: 4_950_000 } as never;
      return null;
    });

    const result = await previewDebtSettlementsUseCase.execute({
      householdId: 'household-1',
      year: 2026,
      month: 3,
      auth: { uid: 'user-1', isGlobalAdmin: false },
    });

    expect(result.yearMonth).toBe('2026-03');
    expect(result.hasMissingRepayments).toBe(true);
    expect(result.missingRepaymentAccountNames).toEqual(['Car Loan']);
    expect(result.items).toEqual([
      {
        debtAccountId: 'debt-1',
        debtAccountName: 'Mortgage',
        openingBalance: 4_950_000,
        hasRepaymentRecord: true,
        repaymentCount: 2,
        repaymentAmount: 60000,
        hasSnapshot: false,
        willCreateSnapshot: true,
        snapshotValues: undefined,
      },
      {
        debtAccountId: 'debt-2',
        debtAccountName: 'Car Loan',
        // A current snapshot exists, so the opening balance is the snapshot's
        // frozen opening value (spec 195 fallback order), not the closing one.
        openingBalance: 320000,
        hasRepaymentRecord: false,
        repaymentCount: 0,
        repaymentAmount: 0,
        hasSnapshot: true,
        willCreateSnapshot: false,
        snapshotValues: {
          openingBalance: 320000,
          principalPaid: 8000,
          interestPaid: 2000,
          totalPaid: 10000,
          closingBalance: 300000,
        },
      },
    ]);
  });

  it('returns no warning when every account has repayment record', async () => {
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');
    const { debtSnapshotRepository } = await import('@/infra/repositories/debtSnapshotRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([
      { id: 'debt-1', name: 'Mortgage', currentBalance: 5000000 } as never,
    ]);

    vi.mocked(transactionRepository.listDebtPaymentsByDateRange).mockResolvedValue([
      { debtAccountId: 'debt-1', amount: 50000 } as never,
    ]);

    vi.mocked(debtSnapshotRepository.getSnapshot).mockResolvedValue(null);

    const result = await previewDebtSettlementsUseCase.execute({
      householdId: 'household-1',
      year: 2026,
      month: 3,
      auth: { uid: 'user-1', isGlobalAdmin: false },
    });

    expect(result.hasMissingRepayments).toBe(false);
    expect(result.missingRepaymentAccountNames).toEqual([]);
    expect(result.items[0]?.repaymentAmount).toBe(50000);
    expect(result.items[0]?.willCreateSnapshot).toBe(true);
  });
});
