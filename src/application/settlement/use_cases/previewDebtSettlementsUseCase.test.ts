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
      .mockResolvedValueOnce({ yearMonth: '2026-03' } as never);

    const result = await previewDebtSettlementsUseCase.execute({
      householdId: 'household-1',
      year: 2026,
      month: 3,
    });

    expect(result.yearMonth).toBe('2026-03');
    expect(result.hasMissingRepayments).toBe(true);
    expect(result.missingRepaymentAccountNames).toEqual(['Car Loan']);
    expect(result.items).toEqual([
      {
        debtAccountId: 'debt-1',
        debtAccountName: 'Mortgage',
        openingBalance: 5000000,
        hasRepaymentRecord: true,
        repaymentCount: 2,
        repaymentAmount: 60000,
        hasSnapshot: false,
        willCreateSnapshot: true,
      },
      {
        debtAccountId: 'debt-2',
        debtAccountName: 'Car Loan',
        openingBalance: 300000,
        hasRepaymentRecord: false,
        repaymentCount: 0,
        repaymentAmount: 0,
        hasSnapshot: true,
        willCreateSnapshot: false,
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
    });

    expect(result.hasMissingRepayments).toBe(false);
    expect(result.missingRepaymentAccountNames).toEqual([]);
    expect(result.items[0]?.repaymentAmount).toBe(50000);
    expect(result.items[0]?.willCreateSnapshot).toBe(true);
  });
});
