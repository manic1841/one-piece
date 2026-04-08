import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase/firestore', () => ({
  runTransaction: vi.fn(async (_db, callback: (tx: object) => Promise<unknown>) => callback({})),
}));

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertWritePermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/debtAccountRepository', () => ({
  debtAccountRepository: {
    createDebtAccount: vi.fn(),
    get: vi.fn(),
    checkHasPayments: vi.fn(),
    deactivateDebtAccount: vi.fn(),
    deleteDebtAccount: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: {
    create: vi.fn(),
    findBorrowTransactionsForDebtAccount: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('debt account lifecycle use cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes debtAccountId into LIABILITY_BORROW transaction when creating a debt account', async () => {
    const { createDebtAccountUseCase } = await import('./createDebtAccountUseCase');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');
    const { IntentType } = await import('@/domains/ledger/constants');

    vi.mocked(debtAccountRepository.createDebtAccount).mockResolvedValue('debt-1');
    vi.mocked(transactionRepository.create).mockResolvedValue('tx-1');

    await createDebtAccountUseCase.execute({
      householdId: 'household-1',
      userEmail: 'user@example.com',
      auth: { uid: 'user-1', isGlobalAdmin: false },
      data: {
        name: '房貸 A',
        type: 'mortgage',
        repaymentType: 'equal_payment',
        originalAmount: 1000000,
        currentBalance: 1,
        interestRate: 2.1,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2056-03-01'),
        graceEndDate: null,
        monthlyPayment: 35000,
        linkedProjectId: null,
        isActive: true,
      },
    });

    expect(transactionRepository.create).toHaveBeenCalledTimes(1);
    expect(vi.mocked(transactionRepository.create).mock.calls[0]?.[1]).toMatchObject({
      intentType: IntentType.LIABILITY_BORROW,
      debtAccountId: 'debt-1',
      projectId: null,
      amount: 1000000,
    });
  });

  it('hard deletes associated LIABILITY_BORROW transactions when removing debt account without payments', async () => {
    const { removeDebtAccountUseCase } = await import('./removeDebtAccountUseCase');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(debtAccountRepository.get).mockResolvedValue({
      id: 'debt-1',
      name: '房貸 A',
      type: 'mortgage',
      repaymentType: 'equal_payment',
      originalAmount: 1000000,
      currentBalance: 1000000,
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
    });
    vi.mocked(debtAccountRepository.checkHasPayments).mockResolvedValue(false);
    vi.mocked(transactionRepository.findBorrowTransactionsForDebtAccount).mockResolvedValue([
      {
        id: 'tx-1',
        date: new Date('2026-03-01'),
        description: '房貸 A 借款入帳',
        intentType: 'LIABILITY_BORROW',
        amount: 1000000,
        projectId: null,
        debtAccountId: 'debt-1',
        allocationId: null,
        createdBy: 'user@example.com',
        updatedBy: 'user@example.com',
        createdAt: new Date('2026-03-01'),
        updatedAt: new Date('2026-03-01'),
        ledgerCodes: ['asset:cash', 'liability:mortgage'],
        entries: [
          { ledgerCode: 'asset:cash', debit: 1000000, credit: 0 },
          { ledgerCode: 'liability:mortgage', debit: 0, credit: 1000000 },
        ],
      },
    ] as never);

    const result = await removeDebtAccountUseCase.execute({
      householdId: 'household-1',
      debtAccountId: 'debt-1',
      userEmail: 'user@example.com',
      auth: { uid: 'user-1', isGlobalAdmin: false },
    });

    expect(result).toEqual({ strategy: 'deleted' });
    expect(transactionRepository.delete).toHaveBeenCalledWith(['household-1', 'tx-1'], {});
    expect(debtAccountRepository.deleteDebtAccount).toHaveBeenCalledWith(
      'household-1',
      'debt-1',
      {},
    );
  });
});
