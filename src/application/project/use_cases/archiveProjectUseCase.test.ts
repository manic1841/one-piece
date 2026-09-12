import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { archiveProjectUseCase } from './archiveProjectUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertWritePermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/projectRepository', () => ({
  projectRepository: { archiveProject: vi.fn() },
}));

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: { getTransactionsByProject: vi.fn() },
}));

const auth = { uid: 'user-1', isGlobalAdmin: false };

const baseRequest = {
  householdId: 'household-1',
  projectId: 'p1',
  userEmail: 'user@example.com',
  auth,
};

describe('archiveProjectUseCase — authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue(undefined);
    vi.mocked(transactionRepository.getTransactionsByProject).mockResolvedValue([] as never);
  });

  it('rejects before repository access when permission is denied', async () => {
    vi.mocked(householdPermissionService.assertWritePermission).mockRejectedValue(
      new Error('denied'),
    );

    await expect(archiveProjectUseCase.execute(baseRequest)).rejects.toThrow('denied');
    expect(transactionRepository.getTransactionsByProject).not.toHaveBeenCalled();
    expect(projectRepository.archiveProject).not.toHaveBeenCalled();
  });

  it('archives the project when permission is granted and no recent transactions', async () => {
    await archiveProjectUseCase.execute(baseRequest);
    expect(projectRepository.archiveProject).toHaveBeenCalledTimes(1);
  });
});
