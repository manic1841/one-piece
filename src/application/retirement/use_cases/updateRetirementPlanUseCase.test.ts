import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

import { updateRetirementPlanUseCase } from './updateRetirementPlanUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertWritePermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/retirementRepository', () => ({
  retirementRepository: {
    updatePlan: vi.fn(),
    setOnlyActivePlan: vi.fn(),
  },
}));

describe('updateRetirementPlanUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enforces single active plan when updates.isActive is true', async () => {
    await updateRetirementPlanUseCase.execute({
      householdId: 'household-1',
      planId: 'plan-2',
      updates: { isActive: true },
      userEmail: 'user@example.com',
      auth: { uid: 'u1', isGlobalAdmin: false },
    });

    expect(retirementRepository.updatePlan).toHaveBeenCalledWith(
      'household-1',
      'plan-2',
      'user@example.com',
      { isActive: true },
    );
    expect(retirementRepository.setOnlyActivePlan).toHaveBeenCalledWith(
      'household-1',
      'plan-2',
      'user@example.com',
    );
  });

  it('does not toggle other plans for non-activation updates', async () => {
    await updateRetirementPlanUseCase.execute({
      householdId: 'household-1',
      planId: 'plan-2',
      updates: { name: 'Renamed' },
      userEmail: 'user@example.com',
      auth: { uid: 'u1', isGlobalAdmin: false },
    });

    expect(retirementRepository.setOnlyActivePlan).not.toHaveBeenCalled();
  });
});
