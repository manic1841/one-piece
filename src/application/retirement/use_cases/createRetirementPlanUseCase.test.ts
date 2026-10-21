import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { retirementPlanRepository } from '@/infra/repositories/retirementPlanRepository';

import { createRetirementPlanUseCase } from './createRetirementPlanUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertWritePermission: vi.fn() },
}));

vi.mock('@/infra/repositories/retirementPlanRepository', () => ({
  retirementPlanRepository: { createPlan: vi.fn() },
}));

vi.mock('@/firebase', () => ({ db: {} }));

const auth = { uid: 'u1', email: 'user@example.com', isGlobalAdmin: false };

const assumptions = {
  birthYear: 1990,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflationRate: 0.02,
  annualReturnRate: 0.05,
};

function request(overrides: Record<string, unknown> = {}) {
  return {
    householdId: 'h1',
    auth,
    name: 'Plan',
    assumptions,
    projectionRules: [],
    lifeEvents: [],
    ...overrides,
  };
}

describe('createRetirementPlanUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue();
  });

  it('asserts write permission and creates the plan', async () => {
    vi.mocked(retirementPlanRepository.createPlan).mockResolvedValue({ ok: true, id: 'plan-1' });

    const result = await createRetirementPlanUseCase.execute(request());

    expect(result).toEqual({ ok: true, id: 'plan-1' });
    expect(householdPermissionService.assertWritePermission).toHaveBeenCalledWith(
      'h1',
      'u1',
      false,
    );
    expect(retirementPlanRepository.createPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: 'h1',
        userEmail: 'user@example.com',
        plan: expect.objectContaining({ name: 'Plan' }),
      }),
    );
  });

  it('returns NAME_REQUIRED for a blank name without writing', async () => {
    const result = await createRetirementPlanUseCase.execute(request({ name: '  ' }));

    expect(result).toEqual({ ok: false, code: 'NAME_REQUIRED' });
    expect(retirementPlanRepository.createPlan).not.toHaveBeenCalled();
  });

  it('returns PLAN_INVALID when assumptions fail validation', async () => {
    const result = await createRetirementPlanUseCase.execute(
      request({ assumptions: { ...assumptions, retirementAge: 60.5 } }),
    );

    expect(result).toEqual({ ok: false, code: 'PLAN_INVALID' });
    expect(retirementPlanRepository.createPlan).not.toHaveBeenCalled();
  });

  it('propagates PLAN_TOO_LARGE from the repository', async () => {
    vi.mocked(retirementPlanRepository.createPlan).mockResolvedValue({
      ok: false,
      code: 'PLAN_TOO_LARGE',
    });

    const result = await createRetirementPlanUseCase.execute(request());

    expect(result).toEqual({ ok: false, code: 'PLAN_TOO_LARGE' });
  });

  it('propagates a thrown write', async () => {
    vi.mocked(retirementPlanRepository.createPlan).mockRejectedValue(new Error('boom'));

    await expect(createRetirementPlanUseCase.execute(request())).rejects.toThrow('boom');
  });
});
