import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

import { createRetirementPlanUseCase } from './createRetirementPlanUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertWritePermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/retirementRepository', () => ({
  retirementRepository: {
    createPlan: vi.fn(),
    setOnlyActivePlan: vi.fn(),
  },
}));

describe('createRetirementPlanUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enforces single active plan when creating active plan', async () => {
    vi.mocked(retirementRepository.createPlan).mockResolvedValue('plan-2');

    const plan = {
      name: 'Plan A',
      isActive: true,
      autoUpdate: false,
      currentYear: 2026,
      birthYear: 1990,
      retirementAge: 60,
      lifeExpectancy: 85,
      currentSavings: 0,
      salaryGrowthRate: 3,
      inflationRate: 2,
      investmentReturnRate: 5,
      incomes: [],
      expenses: [],
      events: [],
    };

    const planId = await createRetirementPlanUseCase.execute({
      householdId: 'household-1',
      plan,
      userEmail: 'user@example.com',
      auth: { uid: 'u1', isGlobalAdmin: false },
    });

    expect(planId).toBe('plan-2');
    expect(householdPermissionService.assertWritePermission).toHaveBeenCalled();
    expect(retirementRepository.createPlan).toHaveBeenCalledWith(
      'household-1',
      'user@example.com',
      plan,
    );
    expect(retirementRepository.setOnlyActivePlan).toHaveBeenCalledWith(
      'household-1',
      'plan-2',
      'user@example.com',
    );
  });

  it('does not toggle other plans when creating inactive plan', async () => {
    vi.mocked(retirementRepository.createPlan).mockResolvedValue('plan-3');

    await createRetirementPlanUseCase.execute({
      householdId: 'household-1',
      plan: {
        name: 'Plan B',
        isActive: false,
        autoUpdate: false,
        currentYear: 2026,
        birthYear: 1990,
        retirementAge: 60,
        lifeExpectancy: 85,
        currentSavings: 0,
        salaryGrowthRate: 3,
        inflationRate: 2,
        investmentReturnRate: 5,
        incomes: [],
        expenses: [],
        events: [],
      },
      userEmail: 'user@example.com',
      auth: { uid: 'u1', isGlobalAdmin: false },
    });

    expect(retirementRepository.setOnlyActivePlan).not.toHaveBeenCalled();
  });
});
