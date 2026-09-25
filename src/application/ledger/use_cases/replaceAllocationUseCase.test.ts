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

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: {
    get: vi.fn(),
    updateAllocationId: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/allocationRepository', () => ({
  allocationRepository: {
    listBySourceTransactionId: vi.fn(),
    getByIds: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const sourceTransaction = {
  id: 'transaction-1',
  date: new Date('2026-09-02T00:00:00'),
  amount: 10000,
  intentType: 'INCOME' as const,
  createdBy: 'user@example.com',
  entries: [
    { ledgerCode: 'asset:cash', debit: 10000, credit: 0 },
    { ledgerCode: 'income:salary', debit: 0, credit: 10000 },
  ],
  createdAt: new Date('2026-09-02T00:00:00'),
  updatedAt: new Date('2026-09-02T00:00:00'),
  updatedBy: 'user@example.com',
};

const allocation = {
  transactionDate: sourceTransaction.date,
  totalAmount: sourceTransaction.amount,
  direction: 'INCOME' as const,
  items: [
    { projectId: 'project-1', percentage: 25 },
    { projectId: 'project-2', percentage: 75 },
  ],
};

const request = {
  householdId: 'household-1',
  transactionId: sourceTransaction.id,
  userEmail: 'user@example.com',
  auth: { uid: 'user-1', isGlobalAdmin: true },
  allocation,
};

describe('ReplaceAllocationUseCase', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');
    const { allocationRepository } = await import('@/infra/repositories/allocationRepository');

    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue(undefined);
    vi.mocked(transactionRepository.get).mockResolvedValue(sourceTransaction);
    vi.mocked(transactionRepository.updateAllocationId).mockResolvedValue(undefined);
    vi.mocked(allocationRepository.listBySourceTransactionId).mockResolvedValue([]);
    vi.mocked(allocationRepository.getByIds).mockResolvedValue([]);
    vi.mocked(allocationRepository.create).mockResolvedValue(sourceTransaction.id);
    vi.mocked(allocationRepository.update).mockResolvedValue(undefined);
    vi.mocked(allocationRepository.delete).mockResolvedValue(undefined);
  });

  it('creates a deterministic Allocation for a valid source without one', async () => {
    const { replaceAllocationUseCase } = await import('./replaceAllocationUseCase');
    const { allocationRepository } = await import('@/infra/repositories/allocationRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    await expect(replaceAllocationUseCase.execute(request)).resolves.toBeUndefined();

    expect(allocationRepository.create).toHaveBeenCalledWith(
      ['household-1'],
      expect.objectContaining({
        sourceTransactionId: 'transaction-1',
        direction: 'INCOME',
        totalAmount: 10000,
        items: [
          { projectId: 'project-1', percentage: 25, amount: 2500 },
          { projectId: 'project-2', percentage: 75, amount: 7500 },
        ],
      }),
      'user@example.com',
      expect.anything(),
      'transaction-1',
    );
    expect(transactionRepository.updateAllocationId).toHaveBeenCalledWith(
      'household-1',
      'transaction-1',
      'transaction-1',
      'user@example.com',
      expect.anything(),
    );
  });

  it('updates the deterministic current Allocation without creating another document', async () => {
    const { replaceAllocationUseCase } = await import('./replaceAllocationUseCase');
    const { allocationRepository } = await import('@/infra/repositories/allocationRepository');

    const currentAllocation = {
      id: 'transaction-1',
      sourceTransactionId: 'transaction-1',
      date: sourceTransaction.date,
      yearMonth: '2026-09',
      direction: 'INCOME',
      totalAmount: 10000,
      items: [{ projectId: 'project-old', percentage: 100, amount: 10000 }],
      projectIds: ['project-old'],
      createdBy: 'original@example.com',
      createdAt: new Date('2026-09-01T00:00:00'),
      updatedAt: new Date('2026-09-01T00:00:00'),
    };
    vi.mocked(allocationRepository.listBySourceTransactionId).mockResolvedValue([
      currentAllocation,
    ]);
    vi.mocked(allocationRepository.getByIds).mockResolvedValue([currentAllocation]);

    await replaceAllocationUseCase.execute(request);

    expect(allocationRepository.create).not.toHaveBeenCalled();
    expect(allocationRepository.update).toHaveBeenCalledWith(
      ['household-1', 'transaction-1'],
      expect.objectContaining({
        sourceTransactionId: 'transaction-1',
        items: [
          { projectId: 'project-1', percentage: 25, amount: 2500 },
          { projectId: 'project-2', percentage: 75, amount: 7500 },
        ],
      }),
      'user@example.com',
      expect.anything(),
    );
    expect(allocationRepository.delete).not.toHaveBeenCalled();
  });

  it('normalizes a legacy random-ID Allocation in the same transaction', async () => {
    const { replaceAllocationUseCase } = await import('./replaceAllocationUseCase');
    const { allocationRepository } = await import('@/infra/repositories/allocationRepository');

    const legacyAllocation = {
      id: 'legacy-allocation-1',
      sourceTransactionId: 'transaction-1',
      date: sourceTransaction.date,
      yearMonth: '2026-09',
      direction: 'INCOME',
      totalAmount: 10000,
      items: [{ projectId: 'project-old', percentage: 100, amount: 10000 }],
      projectIds: ['project-old'],
      createdBy: 'original@example.com',
      createdAt: new Date('2026-09-01T00:00:00'),
      updatedAt: new Date('2026-09-01T00:00:00'),
    };
    vi.mocked(allocationRepository.listBySourceTransactionId).mockResolvedValue([legacyAllocation]);
    vi.mocked(allocationRepository.getByIds).mockResolvedValue([legacyAllocation]);

    await replaceAllocationUseCase.execute(request);

    expect(allocationRepository.create).toHaveBeenCalledWith(
      ['household-1'],
      expect.anything(),
      'user@example.com',
      expect.anything(),
      'transaction-1',
    );
    expect(allocationRepository.delete).toHaveBeenCalledWith(
      ['household-1', 'legacy-allocation-1'],
      expect.anything(),
    );
  });

  it('rejects unsupported source intent types before any write', async () => {
    const { replaceAllocationUseCase } = await import('./replaceAllocationUseCase');
    const { allocationRepository } = await import('@/infra/repositories/allocationRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(transactionRepository.get).mockResolvedValue({
      ...sourceTransaction,
      intentType: 'TRANSFER',
    });

    await expect(replaceAllocationUseCase.execute(request)).rejects.toMatchObject({
      code: 'UNSUPPORTED_INTENT_TYPE',
    });
    expect(allocationRepository.create).not.toHaveBeenCalled();
    expect(allocationRepository.update).not.toHaveBeenCalled();
    expect(allocationRepository.delete).not.toHaveBeenCalled();
    expect(transactionRepository.updateAllocationId).not.toHaveBeenCalled();
  });

  it('returns a stable permission error before looking up the source', async () => {
    const { replaceAllocationUseCase } = await import('./replaceAllocationUseCase');
    const { householdPermissionService } = await import(
      '@/application/household/householdPermissionService'
    );
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(householdPermissionService.assertWritePermission).mockRejectedValue(
      new Error('Permission denied.'),
    );

    await expect(replaceAllocationUseCase.execute(request)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(transactionRepository.get).not.toHaveBeenCalled();
  });

  it('returns a stable missing-source error without writing', async () => {
    const { replaceAllocationUseCase } = await import('./replaceAllocationUseCase');
    const { allocationRepository } = await import('@/infra/repositories/allocationRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    vi.mocked(transactionRepository.get).mockResolvedValue(null);

    await expect(replaceAllocationUseCase.execute(request)).rejects.toMatchObject({
      code: 'TRANSACTION_NOT_FOUND',
    });
    expect(allocationRepository.create).not.toHaveBeenCalled();
    expect(transactionRepository.updateAllocationId).not.toHaveBeenCalled();
  });

  it('rejects a direction that does not match the source before writing', async () => {
    const { replaceAllocationUseCase } = await import('./replaceAllocationUseCase');
    const { allocationRepository } = await import('@/infra/repositories/allocationRepository');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    await expect(
      replaceAllocationUseCase.execute({
        ...request,
        allocation: { ...allocation, direction: 'EXPENSE' },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_PAYLOAD' });
    expect(allocationRepository.create).not.toHaveBeenCalled();
    expect(transactionRepository.updateAllocationId).not.toHaveBeenCalled();
  });

  it('rejects invalid allocation payload before opening a transaction', async () => {
    const { replaceAllocationUseCase } = await import('./replaceAllocationUseCase');
    const { transactionRepository } = await import('@/infra/repositories/transactionRepository');

    await expect(
      replaceAllocationUseCase.execute({
        ...request,
        allocation: { ...allocation, items: [{ projectId: 'project-1', percentage: 90 }] },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_PAYLOAD' });
    expect(transactionRepository.get).not.toHaveBeenCalled();
  });
});
