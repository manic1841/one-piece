import { beforeEach, describe, expect, it, vi } from 'vitest';

import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { settleProjectsUseCase } from './settleProjectsUseCase';

vi.mock('@/infra/repositories/projectRepository', () => ({
  projectRepository: {
    getProjects: vi.fn(),
    getSnapshot: vi.fn(),
    saveSnapshot: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/allocationRepository', () => ({
  allocationRepository: { getAllocationsByMonth: vi.fn() },
}));

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: {
    getProjectTransfers: vi.fn(),
    getTransactionsByProject: vi.fn(),
  },
}));

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn().mockResolvedValue(undefined),
    assertWritePermission: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('settleProjectsUseCase — period-wide query deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(allocationRepository.getAllocationsByMonth).mockResolvedValue([] as never);
    vi.mocked(transactionRepository.getProjectTransfers).mockResolvedValue([] as never);
    vi.mocked(transactionRepository.getTransactionsByProject).mockResolvedValue([] as never);
    vi.mocked(projectRepository.getSnapshot).mockResolvedValue(null as never);
    vi.mocked(projectRepository.saveSnapshot).mockResolvedValue(undefined as never);
  });

  it('issues period-wide allocation and transfer queries once regardless of project count', async () => {
    vi.mocked(projectRepository.getProjects).mockResolvedValue([
      { id: 'p1', name: 'Project 1' },
      { id: 'p2', name: 'Project 2' },
      { id: 'p3', name: 'Project 3' },
    ] as never);

    await settleProjectsUseCase.execute({
      householdId: 'h1',
      yearMonth: '2025-06',
      userEmail: 'u1@test.com',
      auth: { uid: 'user-1', isGlobalAdmin: false },
    });

    expect(allocationRepository.getAllocationsByMonth).toHaveBeenCalledTimes(1);
    expect(transactionRepository.getProjectTransfers).toHaveBeenCalledTimes(1);
  });

  it('still issues per-project transaction queries and snapshot saves', async () => {
    vi.mocked(projectRepository.getProjects).mockResolvedValue([
      { id: 'p1', name: 'Project 1' },
      { id: 'p2', name: 'Project 2' },
    ] as never);

    await settleProjectsUseCase.execute({
      householdId: 'h1',
      yearMonth: '2025-06',
      userEmail: 'u1@test.com',
      auth: { uid: 'user-1', isGlobalAdmin: false },
    });

    expect(transactionRepository.getTransactionsByProject).toHaveBeenCalledTimes(2);
    expect(projectRepository.saveSnapshot).toHaveBeenCalledTimes(2);
  });

  it('preserves settlement behavior — saves correct snapshot per project', async () => {
    vi.mocked(projectRepository.getProjects).mockResolvedValue([
      { id: 'p1', name: 'Project 1' },
    ] as never);

    await settleProjectsUseCase.execute({
      householdId: 'h1',
      yearMonth: '2025-06',
      userEmail: 'u1@test.com',
      auth: { uid: 'user-1', isGlobalAdmin: false },
    });

    expect(projectRepository.saveSnapshot).toHaveBeenCalledWith(
      'h1',
      'p1',
      expect.objectContaining({ year: 2025, month: 6 }),
      'u1@test.com',
    );
  });
});
