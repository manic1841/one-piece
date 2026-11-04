import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { retirementPlanRepository } from '@/infra/repositories/retirementPlanRepository';

import { deleteRetirementPlanUseCase } from './deleteRetirementPlanUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertWritePermission: vi.fn() },
}));

vi.mock('@/infra/repositories/retirementPlanRepository', () => ({
  retirementPlanRepository: { deletePlan: vi.fn() },
}));

vi.mock('@/firebase', () => ({ db: {} }));

const auth = { uid: 'u1', email: 'user@example.com', isGlobalAdmin: false };

describe('deleteRetirementPlanUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue();
  });

  it('asserts write permission and deletes the plan', async () => {
    vi.mocked(retirementPlanRepository.deletePlan).mockResolvedValue();

    await deleteRetirementPlanUseCase.execute({ householdId: 'h1', planId: 'plan-1', auth });

    expect(householdPermissionService.assertWritePermission).toHaveBeenCalledWith(
      'h1',
      'u1',
      false,
    );
    expect(retirementPlanRepository.deletePlan).toHaveBeenCalledWith('h1', 'plan-1');
  });
});
