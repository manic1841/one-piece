import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { transferBetweenProjectsUseCase } from './transferBetweenProjectsUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertWritePermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: { create: vi.fn() },
}));

const auth = { uid: 'user-1', isGlobalAdmin: false };

const baseRequest = {
  householdId: 'household-1',
  input: {
    fromProjectId: 'p1',
    toProjectId: 'p2',
    amount: 100,
  },
  userEmail: 'user@example.com',
  auth,
};

describe('transferBetweenProjectsUseCase — authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue(undefined);
  });

  it('rejects before repository access when permission is denied', async () => {
    vi.mocked(householdPermissionService.assertWritePermission).mockRejectedValue(
      new Error('denied'),
    );

    await expect(transferBetweenProjectsUseCase.execute(baseRequest)).rejects.toThrow('denied');
    expect(transactionRepository.create).not.toHaveBeenCalled();
  });

  it('writes a transfer transaction when permission is granted', async () => {
    await transferBetweenProjectsUseCase.execute(baseRequest);
    expect(transactionRepository.create).toHaveBeenCalledTimes(1);
  });
});
