import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { removeDebtAccountUseCase } from './removeDebtAccountUseCase';

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    runTransaction: vi.fn(async (_db, callback: (tx: object) => Promise<unknown>) => callback({})),
  };
});

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertWritePermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/debtAccountRepository', () => ({
  debtAccountRepository: {
    get: vi.fn(),
    checkHasPayments: vi.fn(),
    deactivateDebtAccount: vi.fn(),
    deleteDebtAccount: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/debtSnapshotRepository', () => ({
  debtSnapshotRepository: {
    hasSnapshots: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: {
    findBorrowTransactionsForDebtAccount: vi.fn(),
    delete: vi.fn(),
  },
}));

const debtAccount = {
  id: 'debt-1',
  name: '房貸 A',
  type: 'mortgage' as const,
  repaymentType: 'equal_payment' as const,
  originalAmount: 1000000,
  currentBalance: 900000,
  interestRate: 2.1,
  startDate: new Date('2026-03-01'),
  endDate: new Date('2056-03-01'),
  graceEndDate: null,
  monthlyPayment: 35000,
  linkedLedgerCode: 'liability:mortgage',
  linkedProjectId: null,
  note: undefined,
  isActive: true,
  createdAt: new Date('2026-03-01'),
  updatedAt: new Date('2026-03-01'),
  createdBy: 'user@example.com',
  updatedBy: 'user@example.com',
};

const request = {
  householdId: 'household-1',
  debtAccountId: 'debt-1',
  userEmail: 'user@example.com',
  auth: { uid: 'user-1', isGlobalAdmin: false },
};

describe('removeDebtAccountUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(debtAccountRepository.get).mockResolvedValue(debtAccount);
  });

  it('soft deletes when a snapshot exists even without payment transactions', async () => {
    vi.mocked(debtAccountRepository.checkHasPayments).mockResolvedValue(false);
    vi.mocked(debtSnapshotRepository.hasSnapshots).mockResolvedValue(true);

    const result = await removeDebtAccountUseCase.execute(request);

    expect(result).toEqual({ strategy: 'deactivated' });
    expect(debtAccountRepository.deactivateDebtAccount).toHaveBeenCalledWith(
      'household-1',
      'debt-1',
      'user@example.com',
    );
    expect(debtAccountRepository.deleteDebtAccount).not.toHaveBeenCalled();
  });

  it('hard deletes when there are no payments and no snapshots', async () => {
    vi.mocked(debtAccountRepository.checkHasPayments).mockResolvedValue(false);
    vi.mocked(debtSnapshotRepository.hasSnapshots).mockResolvedValue(false);
    vi.mocked(transactionRepository.findBorrowTransactionsForDebtAccount).mockResolvedValue([]);

    const result = await removeDebtAccountUseCase.execute(request);

    expect(result).toEqual({ strategy: 'deleted' });
    expect(debtAccountRepository.deleteDebtAccount).toHaveBeenCalledWith(
      'household-1',
      'debt-1',
      expect.anything(),
    );
    expect(debtAccountRepository.deactivateDebtAccount).not.toHaveBeenCalled();
  });

  it('skips the snapshot check once payment history is confirmed', async () => {
    vi.mocked(debtAccountRepository.checkHasPayments).mockResolvedValue(true);

    const result = await removeDebtAccountUseCase.execute(request);

    expect(result).toEqual({ strategy: 'deactivated' });
    expect(debtSnapshotRepository.hasSnapshots).not.toHaveBeenCalled();
  });

  it('rejects hard delete when the account changed between detection and deletion', async () => {
    vi.mocked(debtAccountRepository.checkHasPayments).mockResolvedValue(false);
    vi.mocked(debtSnapshotRepository.hasSnapshots).mockResolvedValue(false);
    vi.mocked(transactionRepository.findBorrowTransactionsForDebtAccount).mockResolvedValue([]);
    vi.mocked(debtAccountRepository.get)
      .mockResolvedValueOnce(debtAccount)
      .mockResolvedValueOnce({ ...debtAccount, updatedAt: new Date('2026-06-01') });

    await expect(removeDebtAccountUseCase.execute(request)).rejects.toThrow(
      /changed during removal/,
    );
    expect(debtAccountRepository.deleteDebtAccount).not.toHaveBeenCalled();
    expect(transactionRepository.delete).not.toHaveBeenCalled();
  });

  it('rejects before repository access when permission is denied', async () => {
    vi.mocked(householdPermissionService.assertWritePermission).mockRejectedValue(
      new Error('denied'),
    );

    await expect(
      removeDebtAccountUseCase.execute({
        householdId: 'h1',
        debtAccountId: 'd1',
        userEmail: 'u1@test.com',
        auth: { uid: 'user-1', isGlobalAdmin: false },
      }),
    ).rejects.toThrow('denied');
    expect(debtAccountRepository.get).not.toHaveBeenCalled();
    expect(debtAccountRepository.deleteDebtAccount).not.toHaveBeenCalled();
  });
});
