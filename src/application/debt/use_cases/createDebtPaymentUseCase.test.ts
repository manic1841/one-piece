import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDebtPaymentFingerprint,
  DEBT_PAYMENT_FINGERPRINT_VERSION,
  DEBT_PAYMENT_OPERATION_TYPE,
} from '@/domains/operation/fingerprint';

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
    updateDebtAccount: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/debtSnapshotRepository', () => ({
  debtSnapshotRepository: {
    getSnapshot: vi.fn(),
    upsertSnapshot: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/operationRepository', () => ({
  operationRepository: {
    getByKey: vi.fn(),
    createSucceeded: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: {
    create: vi.fn(),
  },
}));

const account = {
  id: 'debt-1',
  name: '房貸 A',
  type: 'mortgage',
  repaymentType: 'equal_payment',
  originalAmount: 100000,
  currentBalance: 10000,
  interestRate: 12,
  startDate: new Date('2026-01-01T00:00:00'),
  endDate: new Date('2030-01-01T00:00:00'),
  graceEndDate: null,
  monthlyPayment: 1200,
  linkedLedgerCode: 'liability:mortgage',
  linkedProjectId: 'project-from-account',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00'),
  updatedAt: new Date('2026-01-01T00:00:00'),
  createdBy: 'creator@example.com',
  updatedBy: 'creator@example.com',
} as const;

const request = {
  householdId: 'household-1',
  userEmail: 'user@example.com',
  auth: { uid: 'user-1', isGlobalAdmin: false },
  debtAccountId: 'debt-1',
  idempotencyKey: 'payment-1',
  totalPayment: 1200,
  date: new Date('2026-05-15T00:00:00'),
} as const;

describe('CreateDebtPaymentUseCase', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');
    const { debtSnapshotRepository } = await import('@/infra/repositories/debtSnapshotRepository');
    const { operationRepository } = await import('@/infra/repositories/operationRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

  vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue(undefined);
    vi.mocked(debtAccountRepository.get).mockResolvedValue(account);
    vi.mocked(debtSnapshotRepository.getSnapshot).mockResolvedValue(null);
    vi.mocked(operationRepository.getByKey).mockResolvedValue(null);
    vi.mocked(operationRepository.createSucceeded).mockResolvedValue(undefined);
    vi.mocked(debtSnapshotRepository.upsertSnapshot).mockResolvedValue(undefined);
    vi.mocked(debtAccountRepository.updateDebtAccount).mockResolvedValue(undefined);
    vi.mocked(transactionRepository.create).mockResolvedValue('tx-1');
  });

  it('rejects before loading the account when permission is denied', async () => {
    const { createDebtPaymentUseCase } = await import('./createDebtPaymentUseCase');
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');

    vi.mocked(householdPermissionService.assertWritePermission).mockRejectedValue(
      new Error('permission denied'),
    );

    await expect(createDebtPaymentUseCase.execute(request)).rejects.toThrow('permission denied');
    expect(debtAccountRepository.get).not.toHaveBeenCalled();
  });

  it('rejects a missing debt account', async () => {
    const { createDebtPaymentUseCase } = await import('./createDebtPaymentUseCase');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');

    vi.mocked(debtAccountRepository.get).mockResolvedValue(null);

    await expect(createDebtPaymentUseCase.execute(request)).rejects.toThrow(
      'DebtAccount debt-1 not found',
    );
  });

  it('rejects an inactive debt account', async () => {
    const { createDebtPaymentUseCase } = await import('./createDebtPaymentUseCase');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');

    vi.mocked(debtAccountRepository.get).mockResolvedValue({ ...account, isActive: false });

    await expect(createDebtPaymentUseCase.execute(request)).rejects.toThrow(
      'Cannot record payment on an inactive debt account',
    );
  });

  it('uses the default description and account project when values are omitted', async () => {
    const { createDebtPaymentUseCase } = await import('./createDebtPaymentUseCase');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');

    const result = await createDebtPaymentUseCase.execute(request);

    expect(result).toEqual({
      transactionId: 'tx-1',
      principal: 1100,
      interest: 100,
      newBalance: 8900,
    });
    expect(transactionRepository.create).toHaveBeenCalledWith(
      ['household-1'],
      expect.objectContaining({
        description: '房貸 A 2026-05 還款',
        projectId: 'project-from-account',
        amount: 1200,
      }),
      'user@example.com',
      {},
    );
    expect(debtAccountRepository.updateDebtAccount).toHaveBeenCalledWith(
      'household-1',
      'debt-1',
      { currentBalance: 8900 },
      'user@example.com',
      {},
    );
  });

  it('propagates transaction repository failures', async () => {
    const { createDebtPaymentUseCase } = await import('./createDebtPaymentUseCase');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');
    const { debtSnapshotRepository } = await import('@/infra/repositories/debtSnapshotRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');
    const failure = new Error('transaction write failed');

    vi.mocked(transactionRepository.create).mockRejectedValue(failure);

    await expect(createDebtPaymentUseCase.execute(request)).rejects.toBe(failure);
    expect(debtSnapshotRepository.upsertSnapshot).toHaveBeenCalledTimes(1);
    expect(debtAccountRepository.updateDebtAccount).toHaveBeenCalledTimes(1);
  });

  it('rejects an empty idempotency key before starting a transaction', async () => {
    const { createDebtPaymentUseCase } = await import('./createDebtPaymentUseCase');
    const { operationRepository } = await import('@/infra/repositories/operationRepository');

    await expect(
      createDebtPaymentUseCase.execute({ ...request, idempotencyKey: '   ' }),
    ).rejects.toMatchObject({ code: 'INVALID_IDEMPOTENCY_KEY' });
    expect(operationRepository.getByKey).not.toHaveBeenCalled();
  });

  it('returns a successful operation result without writing on replay', async () => {
    const { createDebtPaymentUseCase } = await import('./createDebtPaymentUseCase');
    const { operationRepository } = await import('@/infra/repositories/operationRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');
    const payloadFingerprint = await createDebtPaymentFingerprint({
      operationType: DEBT_PAYMENT_OPERATION_TYPE,
      fingerprintVersion: DEBT_PAYMENT_FINGERPRINT_VERSION,
      debtAccountId: request.debtAccountId,
      totalPayment: request.totalPayment,
      paymentDate: request.date,
      description: request.description,
      explicitProjectId: request.projectId,
    });

    vi.mocked(operationRepository.getByKey).mockResolvedValue({
      id: 'operation-1',
      operationType: DEBT_PAYMENT_OPERATION_TYPE,
      idempotencyKey: request.idempotencyKey,
      fingerprintVersion: DEBT_PAYMENT_FINGERPRINT_VERSION,
      payloadFingerprint,
      status: 'SUCCEEDED',
      resultReference: {
        debtAccountId: request.debtAccountId,
        yearMonth: '2026-05',
        transactionId: 'tx-original',
        principal: 1100,
        interest: 100,
        newBalance: 8900,
      },
      createdAt: new Date('2026-05-15T00:00:00'),
      updatedAt: new Date('2026-05-15T00:00:00'),
      completedAt: new Date('2026-05-15T00:00:00'),
      createdByUid: 'user-1',
    });

    await expect(createDebtPaymentUseCase.execute(request)).resolves.toEqual({
      transactionId: 'tx-original',
      principal: 1100,
      interest: 100,
      newBalance: 8900,
    });
    expect(transactionRepository.create).not.toHaveBeenCalled();
  });

  it('rejects a different payload for an existing idempotency key before loading the account', async () => {
    const { createDebtPaymentUseCase } = await import('./createDebtPaymentUseCase');
    const { debtAccountRepository } = await import('@/infra/repositories/debtAccountRepository');
    const { operationRepository } = await import('@/infra/repositories/operationRepository');

    vi.mocked(operationRepository.getByKey).mockResolvedValue({
      id: 'operation-1',
      operationType: DEBT_PAYMENT_OPERATION_TYPE,
      idempotencyKey: request.idempotencyKey,
      fingerprintVersion: DEBT_PAYMENT_FINGERPRINT_VERSION,
      payloadFingerprint: 'original-fingerprint',
      status: 'SUCCEEDED',
      resultReference: null,
      createdAt: new Date('2026-05-15T00:00:00'),
      updatedAt: new Date('2026-05-15T00:00:00'),
      completedAt: new Date('2026-05-15T00:00:00'),
      createdByUid: 'user-1',
    });

    await expect(
      createDebtPaymentUseCase.execute({ ...request, totalPayment: 1300 }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect(debtAccountRepository.get).not.toHaveBeenCalled();
  });
});