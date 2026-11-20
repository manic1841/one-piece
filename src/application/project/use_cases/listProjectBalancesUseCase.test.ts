import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { listProjectBalancesUseCase } from './listProjectBalancesUseCase';

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: { listByProject: vi.fn(), listTransfersByProject: vi.fn() },
}));

vi.mock('@/infra/repositories/allocationRepository', () => ({
  allocationRepository: { listByProject: vi.fn() },
}));

vi.mock('@/infra/repositories/projectSnapshotRepository', () => ({
  projectSnapshotRepository: { getLatest: vi.fn() },
}));

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertReadPermission: vi.fn().mockResolvedValue(undefined) },
}));

const auth = { uid: 'user-1', isGlobalAdmin: false };

describe('listProjectBalancesUseCase — one permission check per page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(transactionRepository.listByProject).mockResolvedValue([] as never);
    vi.mocked(transactionRepository.listTransfersByProject).mockResolvedValue([] as never);
    vi.mocked(allocationRepository.listByProject).mockResolvedValue([] as never);
  });

  it('checks read permission once, not once per project', async () => {
    vi.mocked(projectSnapshotRepository.getLatest).mockResolvedValue(null as never);

    await listProjectBalancesUseCase.execute({
      householdId: 'h1',
      projectIds: ['p1', 'p2', 'p3'],
      auth,
    });

    expect(householdPermissionService.assertReadPermission).toHaveBeenCalledTimes(1);
    expect(householdPermissionService.assertReadPermission).toHaveBeenCalledWith(
      'h1',
      'user-1',
      false,
    );
  });

  it('returns a balance entry per project from its newest snapshot', async () => {
    vi.mocked(projectSnapshotRepository.getLatest).mockResolvedValue({
      year: 2025,
      month: 6,
      closingBalance: 1000,
    } as never);

    const balances = await listProjectBalancesUseCase.execute({
      householdId: 'h1',
      projectIds: ['p1', 'p2'],
      auth,
    });

    expect([...balances.keys()]).toEqual(['p1', 'p2']);
    expect(balances.get('p1')?.balance).toBe(1000);
    expect(balances.get('p1')?.lastSettledYearMonth).toBe('2025-06');
  });

  it('drops only the rows that fail, keeping the rest', async () => {
    vi.mocked(transactionRepository.listByProject).mockImplementation(async ({ projectId }) => {
      if (projectId === 'p2') throw new Error('boom');
      return [] as never;
    });
    vi.mocked(projectSnapshotRepository.getLatest).mockResolvedValue(null as never);

    const balances = await listProjectBalancesUseCase.execute({
      householdId: 'h1',
      projectIds: ['p1', 'p2', 'p3'],
      auth,
    });

    expect([...balances.keys()]).toEqual(['p1', 'p3']);
  });

  it('skips the permission check entirely for an empty page', async () => {
    const balances = await listProjectBalancesUseCase.execute({
      householdId: 'h1',
      projectIds: [],
      auth,
    });

    expect(balances.size).toBe(0);
    expect(householdPermissionService.assertReadPermission).not.toHaveBeenCalled();
  });
});
