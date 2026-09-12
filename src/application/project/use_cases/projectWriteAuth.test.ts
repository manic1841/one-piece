import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { projectRepository } from '@/infra/repositories/projectRepository';

import { createProjectUseCase } from './createProjectUseCase';
import { deleteProjectUseCase } from './deleteProjectUseCase';
import { updateProjectUseCase } from './updateProjectUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertWritePermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/projectRepository', () => ({
  projectRepository: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const auth = { uid: 'user-1', isGlobalAdmin: false };

describe('project write use cases — authorization rejection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue(undefined);
  });

  it('createProject rejects before repository access when permission denied', async () => {
    vi.mocked(householdPermissionService.assertWritePermission).mockRejectedValue(
      new Error('denied'),
    );

    await expect(
      createProjectUseCase.execute({
        householdId: 'h1',
        data: { name: 'P', isActive: true } as never,
        userEmail: 'u1@test.com',
        auth,
      }),
    ).rejects.toThrow('denied');
    expect(projectRepository.create).not.toHaveBeenCalled();
  });

  it('updateProject rejects before repository access when permission denied', async () => {
    vi.mocked(householdPermissionService.assertWritePermission).mockRejectedValue(
      new Error('denied'),
    );

    await expect(
      updateProjectUseCase.execute({
        householdId: 'h1',
        projectId: 'p1',
        data: { name: 'P2' } as never,
        userEmail: 'u1@test.com',
        auth,
      }),
    ).rejects.toThrow('denied');
    expect(projectRepository.update).not.toHaveBeenCalled();
  });

  it('deleteProject rejects before repository access when permission denied', async () => {
    vi.mocked(householdPermissionService.assertWritePermission).mockRejectedValue(
      new Error('denied'),
    );

    await expect(
      deleteProjectUseCase.execute({
        householdId: 'h1',
        projectId: 'p1',
        auth,
      }),
    ).rejects.toThrow('denied');
    expect(projectRepository.delete).not.toHaveBeenCalled();
  });
});
