import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/infra/repositories/operationRepository', () => ({
  operationRepository: {
    getByKey: vi.fn(),
    createSucceeded: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: {
    generateId: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/allocationRepository', () => ({
  allocationRepository: {
    create: vi.fn(),
  },
}));

const request = {
  householdId: 'household-1',
  userEmail: 'user@example.com',
  auth: { uid: 'user-1', isGlobalAdmin: true },
  idempotencyKey: 'allocation-operation-1',
  data: {
    date: new Date('2026-09-02T00:00:00'),
    description: 'Salary',
    intent: 'SALARY',
    intentType: 'INCOME' as const,
    amount: 10000,
    projectId: null,
    allocationId: null,
    createdBy: 'user@example.com',
    entries: [
      { ledgerCode: 'asset:cash', debit: 10000, credit: 0 },
      { ledgerCode: 'income:salary:charles', debit: 0, credit: 10000 },
    ],
  },
  allocation: {
    direction: 'INCOME' as const,
    items: [{ projectId: 'project-1', percentage: 100 }],
  },
};

describe('CreateTransactionWithAllocationUseCase', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );
    const { operationRepository } = await import('@/infra/repositories/operationRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');
    const { allocationRepository } = await import('@/infra/repositories/allocationRepository');

    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue(undefined);
    vi.mocked(operationRepository.getByKey).mockResolvedValue(null);
    vi.mocked(operationRepository.createSucceeded).mockResolvedValue(undefined);
    vi.mocked(transactionRepository.generateId).mockReturnValue('transaction-1');
    vi.mocked(transactionRepository.create).mockResolvedValue('transaction-1');
    vi.mocked(allocationRepository.create).mockResolvedValue('transaction-1');
  });

  it('creates the transaction and allocation as one command', async () => {
    const { createTransactionWithAllocationUseCase } = await import(
      './createTransactionWithAllocationUseCase'
    );

    await expect(createTransactionWithAllocationUseCase.execute(request)).resolves.toEqual({
      transactionId: 'transaction-1',
      allocationId: 'transaction-1',
    });
  });

  it('rejects before generating an id or reading operation state when permission is denied', async () => {
    const { createTransactionWithAllocationUseCase } = await import(
      './createTransactionWithAllocationUseCase'
    );
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );
    const { operationRepository } = await import('@/infra/repositories/operationRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(householdPermissionService.assertWritePermission).mockRejectedValue(
      new Error('permission denied'),
    );

    await expect(createTransactionWithAllocationUseCase.execute(request)).rejects.toThrow(
      'permission denied',
    );
    expect(operationRepository.getByKey).not.toHaveBeenCalled();
    expect(transactionRepository.generateId).not.toHaveBeenCalled();
  });

  it('returns the original result on a same-key replay without writing again', async () => {
    const { createTransactionWithAllocationUseCase } = await import(
      './createTransactionWithAllocationUseCase'
    );
    const {
      createTransactionWithAllocationFingerprint,
      TRANSACTION_WITH_ALLOCATION_FINGERPRINT_VERSION,
      TRANSACTION_WITH_ALLOCATION_OPERATION_TYPE,
    } = await import('@/domains/operation/fingerprint');
    const { operationRepository } = await import('@/infra/repositories/operationRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');
    const { allocationRepository } = await import('@/infra/repositories/allocationRepository');
    const payloadFingerprint = await createTransactionWithAllocationFingerprint({
      transaction: request.data,
      allocation: request.allocation,
    });

    vi.mocked(operationRepository.getByKey).mockResolvedValue({
      id: 'operation-1',
      operationType: TRANSACTION_WITH_ALLOCATION_OPERATION_TYPE,
      idempotencyKey: request.idempotencyKey,
      fingerprintVersion: TRANSACTION_WITH_ALLOCATION_FINGERPRINT_VERSION,
      payloadFingerprint,
      status: 'SUCCEEDED',
      resultReference: {
        transactionId: 'original-transaction',
        allocationId: 'original-transaction',
      },
      createdAt: new Date('2026-09-02T00:00:00'),
      updatedAt: new Date('2026-09-02T00:00:00'),
      completedAt: new Date('2026-09-02T00:00:00'),
      createdByUid: 'user-1',
    });

    await expect(createTransactionWithAllocationUseCase.execute(request)).resolves.toEqual({
      transactionId: 'original-transaction',
      allocationId: 'original-transaction',
    });
    expect(transactionRepository.create).not.toHaveBeenCalled();
    expect(allocationRepository.create).not.toHaveBeenCalled();
    expect(operationRepository.createSucceeded).not.toHaveBeenCalled();
  });

  it('rejects a different payload for an existing key without writing', async () => {
    const { createTransactionWithAllocationUseCase } = await import(
      './createTransactionWithAllocationUseCase'
    );
    const { operationRepository } = await import('@/infra/repositories/operationRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');
    const { allocationRepository } = await import('@/infra/repositories/allocationRepository');

    vi.mocked(operationRepository.getByKey).mockResolvedValue({
      id: 'operation-1',
      operationType: 'TRANSACTION_WITH_ALLOCATION',
      idempotencyKey: request.idempotencyKey,
      fingerprintVersion: 1,
      payloadFingerprint: 'original-fingerprint',
      status: 'SUCCEEDED',
      resultReference: {
        transactionId: 'original-transaction',
        allocationId: 'original-transaction',
      },
      createdAt: new Date('2026-09-02T00:00:00'),
      updatedAt: new Date('2026-09-02T00:00:00'),
      completedAt: new Date('2026-09-02T00:00:00'),
      createdByUid: 'user-1',
    });

    await expect(
      createTransactionWithAllocationUseCase.execute({
        ...request,
        data: { ...request.data, amount: 12000 },
      }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect(transactionRepository.create).not.toHaveBeenCalled();
    expect(allocationRepository.create).not.toHaveBeenCalled();
  });

  it('rejects invalid keys and payloads before starting the transaction', async () => {
    const { createTransactionWithAllocationUseCase } = await import(
      './createTransactionWithAllocationUseCase'
    );
    const { operationRepository } = await import('@/infra/repositories/operationRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    await expect(
      createTransactionWithAllocationUseCase.execute({ ...request, idempotencyKey: '   ' }),
    ).rejects.toMatchObject({ code: 'INVALID_IDEMPOTENCY_KEY' });
    await expect(
      createTransactionWithAllocationUseCase.execute({
        ...request,
        data: { ...request.data, intentType: 'TRANSFER' },
      }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_INTENT_TYPE' });
    await expect(
      createTransactionWithAllocationUseCase.execute({
        ...request,
        allocation: { direction: 'INCOME', items: [{ projectId: 'project-1', percentage: 90 }] },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_PAYLOAD' });

    expect(operationRepository.getByKey).not.toHaveBeenCalled();
    expect(transactionRepository.generateId).not.toHaveBeenCalled();
  });
});