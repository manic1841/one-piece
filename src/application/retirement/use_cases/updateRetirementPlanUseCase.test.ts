import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import {
  RetirementPlanCommandError,
  RetirementPlanCommandErrorCode,
} from '@/domains/retirement/retirementPlanErrors';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

import { updateRetirementPlanUseCase } from './updateRetirementPlanUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertWritePermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/retirementRepository', () => ({
  retirementRepository: {
    updatePlanAtomically: vi.fn(),
    getPlanSummaries: vi.fn(),
  },
}));

const auth = { uid: 'u1', isGlobalAdmin: false };

describe('updateRetirementPlanUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue();
    vi.mocked(retirementRepository.getPlanSummaries).mockResolvedValue([
      { id: 'plan-2', isActive: true },
    ] as never);
  });

  it('preflights plans and delegates to the atomic update on activation', async () => {
    vi.mocked(retirementRepository.updatePlanAtomically).mockResolvedValue();

    await updateRetirementPlanUseCase.execute({
      householdId: 'household-1',
      planId: 'plan-2',
      updates: { isActive: true },
      userEmail: 'user@example.com',
      auth,
    });

    expect(retirementRepository.getPlanSummaries).toHaveBeenCalledWith('household-1');
    expect(retirementRepository.updatePlanAtomically).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: 'household-1',
        planId: 'plan-2',
        updates: { isActive: true },
        existingPlans: [expect.objectContaining({ id: 'plan-2' })],
      }),
    );
  });

  it('skips the preflight for non-activation updates', async () => {
    vi.mocked(retirementRepository.updatePlanAtomically).mockResolvedValue();

    await updateRetirementPlanUseCase.execute({
      householdId: 'household-1',
      planId: 'plan-2',
      updates: { name: 'Renamed' },
      userEmail: 'user@example.com',
      auth,
    });

    expect(retirementRepository.getPlanSummaries).not.toHaveBeenCalled();
    expect(retirementRepository.updatePlanAtomically).toHaveBeenCalledWith(
      expect.objectContaining({ existingPlans: [] }),
    );
  });

  it('propagates PLAN_NOT_FOUND from the atomic update', async () => {
    vi.mocked(retirementRepository.updatePlanAtomically).mockRejectedValue(
      new RetirementPlanCommandError(
        RetirementPlanCommandErrorCode.PLAN_NOT_FOUND,
        'Retirement plan not found.',
      ),
    );

    await expect(
      updateRetirementPlanUseCase.execute({
        householdId: 'household-1',
        planId: 'plan-missing',
        updates: { name: 'Renamed' },
        userEmail: 'user@example.com',
        auth,
      }),
    ).rejects.toMatchObject({ code: RetirementPlanCommandErrorCode.PLAN_NOT_FOUND });
  });

  it('wraps unexpected repository failures with TRANSACTION_FAILED', async () => {
    vi.mocked(retirementRepository.updatePlanAtomically).mockRejectedValue(
      new Error('write failed'),
    );

    await expect(
      updateRetirementPlanUseCase.execute({
        householdId: 'household-1',
        planId: 'plan-2',
        updates: { name: 'Renamed' },
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
      updateRetirementPlanUseCase.execute({
        householdId: 'household-1',
        planId: 'plan-2',
        updates: { name: 'Renamed' },
        userEmail: 'user@example.com',
        auth,
      }),
    ).rejects.toThrow('denied');
    expect(retirementRepository.updatePlanAtomically).not.toHaveBeenCalled();
  });
});
