import { beforeEach, describe, expect, it, vi } from 'vitest';

import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { getProjectBalanceUseCase } from './getProjectBalanceUseCase';

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: {
    listByProject: vi.fn(),
    listTransfersByProject: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/allocationRepository', () => ({
  allocationRepository: { listByProject: vi.fn() },
}));

vi.mock('@/infra/repositories/projectRepository', () => ({
  projectRepository: { get: vi.fn() },
}));

vi.mock('@/infra/repositories/projectSnapshotRepository', () => ({
  projectSnapshotRepository: { getLatest: vi.fn() },
}));

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertReadPermission: vi.fn().mockResolvedValue(undefined) },
}));

const auth = { uid: 'user-1', isGlobalAdmin: false };

describe('getProjectBalanceUseCase — server-side date filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectRepository.get).mockResolvedValue({ id: 'p1', name: 'Project 1' } as never);
  });

  it('passes snapshot date to transactionRepository.listByProject', async () => {
    // snapshot year=2025, month=6 → new Date(2025, 6, 0, 23, 59, 59) = June 30
    const expectedSnapshotDate = new Date(2025, 6, 0, 23, 59, 59);
    vi.mocked(projectSnapshotRepository.getLatest).mockResolvedValue({
      year: 2025,
      month: 6,
      closingBalance: 1000,
    } as never);
    vi.mocked(transactionRepository.listByProject).mockResolvedValue([] as never);
    vi.mocked(transactionRepository.listTransfersByProject).mockResolvedValue([] as never);
    vi.mocked(allocationRepository.listByProject).mockResolvedValue([] as never);

    await getProjectBalanceUseCase.execute({ householdId: 'h1', projectId: 'p1', auth });

    expect(transactionRepository.listByProject).toHaveBeenCalledWith(
      'h1',
      'p1',
      expectedSnapshotDate,
    );
  });

  it('passes snapshot date to listTransfersByProject', async () => {
    const expectedSnapshotDate = new Date(2025, 6, 0, 23, 59, 59);
    vi.mocked(projectSnapshotRepository.getLatest).mockResolvedValue({
      year: 2025,
      month: 6,
      closingBalance: 1000,
    } as never);
    vi.mocked(transactionRepository.listByProject).mockResolvedValue([] as never);
    vi.mocked(transactionRepository.listTransfersByProject).mockResolvedValue([] as never);
    vi.mocked(allocationRepository.listByProject).mockResolvedValue([] as never);

    await getProjectBalanceUseCase.execute({ householdId: 'h1', projectId: 'p1', auth });

    expect(transactionRepository.listTransfersByProject).toHaveBeenCalledWith(
      'h1',
      'p1',
      undefined,
      expectedSnapshotDate,
    );
  });

  it('passes snapshot yearMonth to allocationRepository.listByProject', async () => {
    vi.mocked(projectSnapshotRepository.getLatest).mockResolvedValue({
      year: 2025,
      month: 6,
      closingBalance: 1000,
    } as never);
    vi.mocked(transactionRepository.listByProject).mockResolvedValue([] as never);
    vi.mocked(transactionRepository.listTransfersByProject).mockResolvedValue([] as never);
    vi.mocked(allocationRepository.listByProject).mockResolvedValue([] as never);

    await getProjectBalanceUseCase.execute({ householdId: 'h1', projectId: 'p1', auth });

    expect(allocationRepository.listByProject).toHaveBeenCalledWith(
      'h1',
      'p1',
      undefined,
      '2025-07',
    );
  });

  it('preserves balance calculation with server-filtered data', async () => {
    vi.mocked(projectSnapshotRepository.getLatest).mockResolvedValue({
      year: 2025,
      month: 6,
      closingBalance: 1000,
    } as never);
    vi.mocked(transactionRepository.listByProject).mockResolvedValue([
      { id: 'tx1', amount: 200, intentType: 'INCOME', intent: null },
    ] as never);
    vi.mocked(transactionRepository.listTransfersByProject).mockResolvedValue([] as never);
    vi.mocked(allocationRepository.listByProject).mockResolvedValue([] as never);

    const result = await getProjectBalanceUseCase.execute({
      householdId: 'h1',
      projectId: 'p1',
      auth,
    });

    expect(result?.balance).toBe(1200); // 1000 base + 200 income
  });
});
