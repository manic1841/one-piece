import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import {
  RetirementPlanCommandError,
  RetirementPlanCommandErrorCode,
} from '@/domains/retirement/retirementPlanErrors';
import { retirementRepository } from '@/infra/repositories/retirementRepository';

import { deleteRetirementPlanUseCase } from './deleteRetirementPlanUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertWritePermission: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/retirementRepository', () => ({
  retirementRepository: {
    deletePlanAtomically: vi.fn(),
    countChildren: vi.fn().mockResolvedValue(0),
  },
}));

const auth = { uid: 'u1', isGlobalAdmin: false };

describe('deleteRetirementPlanUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue();
    vi.mocked(retirementRepository.deletePlanAtomically).mockResolvedValue();
  });

  it('delegates to the atomic delete', async () => {
    await deleteRetirementPlanUseCase.execute({
      householdId: 'household-1',
      planId: 'plan-1',
      auth,
    });

    expect(retirementRepository.deletePlanAtomically).toHaveBeenCalledWith({
      householdId: 'household-1',
      planId: 'plan-1',
    });
  });

  it('propagates PLAN_NOT_FOUND for a missing plan', async () => {
    vi.mocked(retirementRepository.deletePlanAtomically).mockRejectedValue(
      new RetirementPlanCommandError(
        RetirementPlanCommandErrorCode.PLAN_NOT_FOUND,
        'Retirement plan not found.',
      ),
    );

    await expect(
      deleteRetirementPlanUseCase.execute({ householdId: 'household-1', planId: 'plan-x', auth }),
    ).rejects.toMatchObject({ code: RetirementPlanCommandErrorCode.PLAN_NOT_FOUND });
  });

  it('wraps unexpected failures with TRANSACTION_FAILED', async () => {
    vi.mocked(retirementRepository.deletePlanAtomically).mockRejectedValue(
      new Error('write failed'),
    );

    await expect(
      deleteRetirementPlanUseCase.execute({ householdId: 'household-1', planId: 'plan-1', auth }),
    ).rejects.toMatchObject({ code: RetirementPlanCommandErrorCode.TRANSACTION_FAILED });
  });

  it('propagates permission rejections without touching the repository', async () => {
    vi.mocked(householdPermissionService.assertWritePermission).mockRejectedValue(
      new Error('denied'),
    );

    await expect(
      deleteRetirementPlanUseCase.execute({ householdId: 'household-1', planId: 'plan-1', auth }),
    ).rejects.toThrow('denied');
    expect(retirementRepository.deletePlanAtomically).not.toHaveBeenCalled();
  });
});
