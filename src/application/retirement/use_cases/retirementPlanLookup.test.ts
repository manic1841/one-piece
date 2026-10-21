import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type RetirementPlan } from '@/infra/repositories/retirementPlanRepository';
import { retirementPlanRepository } from '@/infra/repositories/retirementPlanRepository';

import { renameRetirementPlan } from './retirementPlanLookup';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn(),
    assertWritePermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/retirementPlanRepository', () => ({
  retirementPlanRepository: {
    getPlan: vi.fn(),
    updatePlan: vi.fn(),
    deletePlan: vi.fn(),
    listPlans: vi.fn(),
  },
}));

vi.mock('@/firebase', () => ({ db: {} }));

const auth = { uid: 'u1', email: 'user@example.com', isGlobalAdmin: false };

const plan: RetirementPlan = {
  id: 'plan-1',
  name: 'Old name',
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
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-02-01T00:00:00Z'),
};

describe('renameRetirementPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue();
  });

  it('changes only the name and updatedAt, leaving birthYear untouched', async () => {
    vi.mocked(retirementPlanRepository.getPlan).mockResolvedValue(plan);
    vi.mocked(retirementPlanRepository.updatePlan).mockResolvedValue({ ok: true });

    const before = Date.now();
    const result = await renameRetirementPlan({
      householdId: 'h1',
      planId: 'plan-1',
      name: '  New name  ',
      userEmail: 'u1',
      auth,
    });

    expect(result.ok).toBe(true);
    const update = vi.mocked(retirementPlanRepository.updatePlan).mock.calls[0][0];
    expect(update.plan.name).toBe('  New name  ');
    expect(update.plan.assumptions).toEqual({
      retirementAge: 60,
      lifeExpectancy: 85,
      inflationRate: 0.02,
      annualReturnRate: 0.05,
    });
    expect(update.plan.assumptions).not.toHaveProperty('birthYear');
    expect(update.plan.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(update.plan.createdAt).toEqual(plan.createdAt);
  });

  it('returns PLAN_NOT_FOUND without writing when the plan is gone', async () => {
    vi.mocked(retirementPlanRepository.getPlan).mockResolvedValue(null);

    const result = await renameRetirementPlan({
      householdId: 'h1',
      planId: 'plan-1',
      name: 'New name',
      userEmail: 'u1',
      auth,
    });

    expect(result).toEqual({ ok: false, code: 'PLAN_NOT_FOUND' });
    expect(retirementPlanRepository.updatePlan).not.toHaveBeenCalled();
  });

  it('propagates a repository failure', async () => {
    vi.mocked(retirementPlanRepository.getPlan).mockResolvedValue(plan);
    vi.mocked(retirementPlanRepository.updatePlan).mockResolvedValue({
      ok: false,
      code: 'PLAN_INVALID',
    });

    const result = await renameRetirementPlan({
      householdId: 'h1',
      planId: 'plan-1',
      name: 'New name',
      userEmail: 'u1',
      auth,
    });

    expect(result).toEqual({ ok: false, code: 'PLAN_INVALID' });
  });
});
