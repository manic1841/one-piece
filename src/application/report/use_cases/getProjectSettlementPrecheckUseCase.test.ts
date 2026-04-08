import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProjectSettlementPrecheckUseCase } from './getProjectSettlementPrecheckUseCase';

vi.mock('@/infra/repositories/projectRepository', () => ({
  projectRepository: {
    getProjects: vi.fn(),
    getSnapshot: vi.fn(),
  },
}));

describe('getProjectSettlementPrecheckUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes when there are no active projects', async () => {
    const { projectRepository } = await import('@/infra/repositories/projectRepository');

    vi.mocked(projectRepository.getProjects).mockResolvedValue([]);

    const result = await getProjectSettlementPrecheckUseCase.execute({
      householdId: 'household-1',
      yearMonth: '2026-03',
    });

    expect(result).toEqual({
      hasProjects: false,
      allProjectsSettled: true,
      unsettledProjectIds: [],
      unsettledProjectNames: [],
    });
    expect(projectRepository.getSnapshot).not.toHaveBeenCalled();
  });

  it('fails when any active project is missing a snapshot', async () => {
    const { projectRepository } = await import('@/infra/repositories/projectRepository');

    vi.mocked(projectRepository.getProjects).mockResolvedValue([
      { id: 'project-1', name: 'Project 1' } as never,
      { id: 'project-2', name: 'Project 2' } as never,
    ]);
    vi.mocked(projectRepository.getSnapshot)
      .mockResolvedValueOnce({ id: 'snapshot-1' } as never)
      .mockResolvedValueOnce(null);

    const result = await getProjectSettlementPrecheckUseCase.execute({
      householdId: 'household-1',
      yearMonth: '2026-03',
    });

    expect(result).toEqual({
      hasProjects: true,
      allProjectsSettled: false,
      unsettledProjectIds: ['project-2'],
      unsettledProjectNames: ['Project 2'],
    });
  });

  it('passes when all active projects have snapshots', async () => {
    const { projectRepository } = await import('@/infra/repositories/projectRepository');

    vi.mocked(projectRepository.getProjects).mockResolvedValue([
      { id: 'project-1', name: 'Project 1' } as never,
      { id: 'project-2', name: 'Project 2' } as never,
    ]);
    vi.mocked(projectRepository.getSnapshot)
      .mockResolvedValueOnce({ id: 'snapshot-1' } as never)
      .mockResolvedValueOnce({ id: 'snapshot-2' } as never);

    const result = await getProjectSettlementPrecheckUseCase.execute({
      householdId: 'household-1',
      yearMonth: '2026-03',
    });

    expect(result).toEqual({
      hasProjects: true,
      allProjectsSettled: true,
      unsettledProjectIds: [],
      unsettledProjectNames: [],
    });
    expect(projectRepository.getSnapshot).toHaveBeenCalledTimes(2);
  });
});
