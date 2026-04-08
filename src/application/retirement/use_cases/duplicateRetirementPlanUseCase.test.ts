import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

import { duplicateRetirementPlanUseCase } from './duplicateRetirementPlanUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertWritePermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/retirementRepository', () => ({
  retirementRepository: {
    getPlan: vi.fn(),
    createPlan: vi.fn(),
  },
}));

describe('duplicateRetirementPlanUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('duplicates source plan as inactive copy', async () => {
    vi.mocked(retirementRepository.getPlan).mockResolvedValue({
      id: 'source-1',
      householdId: 'household-1',
      name: 'My Plan',
      isActive: true,
      autoUpdate: true,
      createdBy: 'u1',
      updatedBy: 'u1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      currentYear: 2026,
      birthYear: 1990,
      retirementAge: 60,
      lifeExpectancy: 85,
      currentSavings: 100000,
      salaryGrowthRate: 3,
      inflationRate: 2,
      investmentReturnRate: 5,
      incomes: [],
      expenses: [],
      events: [],
      summary: {
        retirementYear: 2050,
        savingsAtRetirement: 2000000,
        minSavings: 500000,
        minSavingsYear: 2060,
        isBankrupt: false,
        lastCalculatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    } as never);
    vi.mocked(retirementRepository.createPlan).mockResolvedValue('copy-1');

    const copyId = await duplicateRetirementPlanUseCase.execute({
      householdId: 'household-1',
      sourcePlanId: 'source-1',
      userEmail: 'user@example.com',
      auth: { uid: 'u1', isGlobalAdmin: false },
    });

    expect(copyId).toBe('copy-1');
    expect(retirementRepository.createPlan).toHaveBeenCalledWith(
      'household-1',
      'user@example.com',
      expect.objectContaining({
        name: 'My Plan (Copy)',
        isActive: false,
        autoUpdate: true,
      }),
    );
  });

  it('throws when source plan does not exist', async () => {
    vi.mocked(retirementRepository.getPlan).mockResolvedValue(null);

    await expect(
      duplicateRetirementPlanUseCase.execute({
        householdId: 'household-1',
        sourcePlanId: 'missing',
        userEmail: 'user@example.com',
        auth: { uid: 'u1', isGlobalAdmin: false },
      }),
    ).rejects.toThrow('Retirement plan not found.');
  });
});
