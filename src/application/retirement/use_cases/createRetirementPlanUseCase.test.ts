import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { RetirementPlanCommandErrorCode } from '@/domains/retirement/retirementPlanErrors';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

import { createRetirementPlanUseCase } from './createRetirementPlanUseCase';

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    runTransaction: vi.fn(async (_db, callback: (tx: object) => Promise<unknown>) => callback({})),
  };
});

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertWritePermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/retirementRepository', () => ({
  retirementRepository: {
    createPlanAtomically: vi.fn(),
    getPlanSummaries: vi.fn(),
  },
}));

vi.mock('@/firebase', () => ({ db: {} }));

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

const auth = { uid: 'u1', isGlobalAdmin: false };

describe('createRetirementPlanUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue();
  });

  it('commits the plan document, children, and active fan-out through one atomic command', async () => {
    vi.mocked(retirementRepository.getPlanSummaries).mockResolvedValue([
      { id: 'existing-active-plan', isActive: true },
    ] as never);
    vi.mocked(retirementRepository.createPlanAtomically).mockResolvedValue('plan-1');

    const planId = await createRetirementPlanUseCase.execute({
      householdId: 'household-1',
      plan,
      userEmail: 'user@example.com',
      auth,
    });

    expect(planId).toBe('plan-1');
    expect(retirementRepository.createPlanAtomically).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: 'household-1',
        plan: expect.objectContaining({ name: 'Plan A', isActive: true }),
        userEmail: 'user@example.com',
        existingPlans: [expect.objectContaining({ id: 'existing-active-plan' })],
      }),
    );
  });

  it('skips the active-plan preflight when the new plan is inactive', async () => {
    vi.mocked(retirementRepository.createPlanAtomically).mockResolvedValue('plan-2');

    await createRetirementPlanUseCase.execute({
      householdId: 'household-1',
      plan: { ...plan, isActive: false },
      userEmail: 'user@example.com',
      auth,
    });

    expect(retirementRepository.getPlanSummaries).not.toHaveBeenCalled();
    expect(retirementRepository.createPlanAtomically).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: expect.objectContaining({ isActive: false }),
        existingPlans: [],
      }),
    );
  });

  it('rejects payloads whose dynamic write count exceeds the limit', async () => {
    const oversizedPlan = {
      ...plan,
      incomes: Array.from({ length: 220 }, (_, index) => incomeFixture(`income-${index}`)),
      expenses: Array.from({ length: 200 }, (_, index) => expenseFixture(`expense-${index}`)),
      events: [],
    };

    await expect(
      createRetirementPlanUseCase.execute({
        householdId: 'household-1',
        plan: oversizedPlan,
        userEmail: 'user@example.com',
        auth,
      }),
    ).rejects.toMatchObject({ code: RetirementPlanCommandErrorCode.PLAN_TOO_LARGE });

    expect(retirementRepository.createPlanAtomically).not.toHaveBeenCalled();
  });

  it('wraps transaction failures with a stable error code', async () => {
    vi.mocked(retirementRepository.createPlanAtomically).mockRejectedValue(
      new Error('write failed'),
    );

    await expect(
      createRetirementPlanUseCase.execute({
        householdId: 'household-1',
        plan,
        userEmail: 'user@example.com',
        auth,
      }),
    ).rejects.toMatchObject({
      code: RetirementPlanCommandErrorCode.TRANSACTION_FAILED,
      name: 'RetirementPlanCommandError',
    });
  });

  it('propagates permission rejections without touching the repository', async () => {
    vi.mocked(householdPermissionService.assertWritePermission).mockRejectedValue(
      new Error('denied'),
    );

    await expect(
      createRetirementPlanUseCase.execute({
        householdId: 'household-1',
        plan,
        userEmail: 'user@example.com',
        auth,
      }),
    ).rejects.toThrow('denied');
    expect(retirementRepository.createPlanAtomically).not.toHaveBeenCalled();
  });
});

function incomeFixture(id: string) {
  return {
    id,
    name: id,
    type: 'SALARY',
    startYear: 2026,
    baseAmount: 1000,
    growthRate: 0,
    autoUpdate: false,
    lifelong: true,
  };
}

function expenseFixture(id: string) {
  return {
    id,
    name: id,
    type: 'FIXED',
    calculationMode: 'FIXED',
    baseAmount: 1000,
    growthRate: 0,
    startYear: 2026,
  };
}
