import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createRetirementPlanUseCase } from '@/application/retirement/use_cases/createRetirementPlanUseCase';
import { projectionRepository } from '@/infra/repositories/projectionRepository';

import { saveProjectionAsPlanWorkflow } from './saveProjectionAsPlan';

vi.mock('@/infra/repositories/projectionRepository', () => ({
  projectionRepository: { getProjectionConfig: vi.fn() },
}));

vi.mock('@/application/retirement/use_cases/createRetirementPlanUseCase', () => ({
  createRetirementPlanUseCase: { execute: vi.fn() },
}));

const auth = { uid: 'u1', email: 'user@example.com', isGlobalAdmin: false };

const assumptions = {
  birthYear: 1990,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflationRate: 0.02,
  annualReturnRate: 0.05,
};

describe('saveProjectionAsPlanWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('copies the frozen config into a new plan', async () => {
    vi.mocked(projectionRepository.getProjectionConfig).mockResolvedValue({
      startYear: 2026,
      openingNetWorth: { amount: 1, source: 'manual' },
      assumptions,
      projectionRules: [],
      lifeEvents: [],
    });
    vi.mocked(createRetirementPlanUseCase.execute).mockResolvedValue({ ok: true, id: 'plan-1' });

    const result = await saveProjectionAsPlanWorkflow.execute({
      householdId: 'h1',
      projectionId: 'projection-1',
      name: 'Plan',
      auth,
    });

    expect(result).toEqual({ ok: true, id: 'plan-1' });
    expect(createRetirementPlanUseCase.execute).toHaveBeenCalledWith({
      householdId: 'h1',
      auth,
      name: 'Plan',
      assumptions,
      projectionRules: [],
      lifeEvents: [],
    });
  });

  it('returns PROJECTION_NOT_FOUND when the projection or its config is gone', async () => {
    vi.mocked(projectionRepository.getProjectionConfig).mockResolvedValue(null);

    const result = await saveProjectionAsPlanWorkflow.execute({
      householdId: 'h1',
      projectionId: 'projection-1',
      name: 'Plan',
      auth,
    });

    expect(result).toEqual({ ok: false, code: 'PROJECTION_NOT_FOUND' });
    expect(createRetirementPlanUseCase.execute).not.toHaveBeenCalled();
  });
});
