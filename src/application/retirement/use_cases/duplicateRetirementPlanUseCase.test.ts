import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RetirementPlanCommandErrorCode,
} from '@/domains/retirement/retirementPlanErrors';
import { duplicateRetirementPlanUseCase } from './duplicateRetirementPlanUseCase';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertWritePermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/retirementRepository', () => ({
  retirementRepository: {
    getPlan: vi.fn(),
    createPlanAtomically: vi.fn(),
    getPlanSummaries: vi.fn(),
  },
}));

const auth = { uid: 'u1', isGlobalAdmin: false };

const sourcePlan = {
  id: 'plan-1',
  name: 'Base Plan',
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

describe('duplicateRetirementPlanUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue();
    vi.mocked(retirementRepository.getPlan).mockResolvedValue(sourcePlan as never);
    vi.mocked(retirementRepository.createPlanAtomically).mockResolvedValue('plan-copy');
    vi.mocked(retirementRepository.getPlanSummaries).mockResolvedValue([]);
  });

  it('duplicates through the atomic create as an inactive copy', async () => {
    const planId = await duplicateRetirementPlanUseCase.execute({
      householdId: 'household-1',
      sourcePlanId: 'plan-1',
      userEmail: 'user@example.com',
      auth,
    });

    expect(planId).toBe('plan-copy');
    expect(retirementRepository.createPlanAtomically).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: expect.objectContaining({
          name: 'Base Plan (Copy)',
          isActive: false,
        }),
        existingPlans: [],
      }),
    );
    expect(retirementRepository.getPlanSummaries).not.toHaveBeenCalled();
  });

  it('rejects with PLAN_NOT_FOUND when the source plan is missing', async () => {
    vi.mocked(retirementRepository.getPlan).mockResolvedValue(null);

    await expect(
      duplicateRetirementPlanUseCase.execute({
        householdId: 'household-1',
        sourcePlanId: 'plan-missing',
        userEmail: 'user@example.com',
        auth,
      }),
    ).rejects.toMatchObject({ code: RetirementPlanCommandErrorCode.PLAN_NOT_FOUND });
    expect(retirementRepository.createPlanAtomically).not.toHaveBeenCalled();
  });

  it('wraps unexpected failures with TRANSACTION_FAILED', async () => {
    vi.mocked(retirementRepository.createPlanAtomically).mockRejectedValue(
      new Error('write failed'),
    );

    await expect(
      duplicateRetirementPlanUseCase.execute({
        householdId: 'household-1',
        sourcePlanId: 'plan-1',
        userEmail: 'user@example.com',
        auth,
      }),
    ).rejects.toMatchObject({ code: RetirementPlanCommandErrorCode.TRANSACTION_FAILED });
  });

  it('propagates permission rejections without touching the repository', async () => {
    vi.mocked(householdPermissionService.assertWritePermission).mockRejectedValue(
      new Error('denied'),
    );

    await expect(
      duplicateRetirementPlanUseCase.execute({
        householdId: 'household-1',
        sourcePlanId: 'plan-1',
        userEmail: 'user@example.com',
        auth,
      }),
    ).rejects.toThrow('denied');
    expect(retirementRepository.getPlan).not.toHaveBeenCalled();
  });
});
