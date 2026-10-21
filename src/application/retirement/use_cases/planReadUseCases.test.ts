import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { retirementPlanRepository } from '@/infra/repositories/retirementPlanRepository';

import { getRetirementPlanUseCase } from './getRetirementPlanUseCase';
import { listRetirementPlansUseCase } from './listRetirementPlansUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertReadPermission: vi.fn() },
}));

vi.mock('@/infra/repositories/retirementPlanRepository', () => ({
  retirementPlanRepository: { getPlan: vi.fn(), listPlans: vi.fn() },
}));

vi.mock('@/firebase', () => ({ db: {} }));

const auth = { uid: 'u1', email: 'user@example.com', isGlobalAdmin: false };

const plan = {
  id: 'plan-1',
  name: 'Plan',
  assumptions: {
    birthYear: 1990,
    retirementAge: 60,
    lifeExpectancy: 85,
    inflationRate: 0.02,
    annualReturnRate: 0.05,
  },
  projectionRules: [],
  lifeEvents: [],
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-02-01'),
};

describe('plan read use cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertReadPermission).mockResolvedValue();
  });

  it('list asserts read permission and returns the repository rows', async () => {
    vi.mocked(retirementPlanRepository.listPlans).mockResolvedValue([plan]);

    const result = await listRetirementPlansUseCase.execute({ householdId: 'h1', auth });

    expect(result).toEqual([plan]);
    expect(householdPermissionService.assertReadPermission).toHaveBeenCalledWith('h1', 'u1', false);
  });

  it('get asserts read permission and returns null when missing', async () => {
    vi.mocked(retirementPlanRepository.getPlan).mockResolvedValue(null);

    const result = await getRetirementPlanUseCase.execute({
      householdId: 'h1',
      planId: 'plan-1',
      auth,
    });

    expect(result).toBeNull();
    expect(householdPermissionService.assertReadPermission).toHaveBeenCalledWith('h1', 'u1', false);
  });
});
