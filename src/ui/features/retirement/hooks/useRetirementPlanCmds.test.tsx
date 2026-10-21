import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createRetirementPlanUseCase } from '@/application/retirement/use_cases/createRetirementPlanUseCase';
import { deleteRetirementPlanUseCase } from '@/application/retirement/use_cases/deleteRetirementPlanUseCase';
import { updateRetirementPlanUseCase } from '@/application/retirement/use_cases/updateRetirementPlanUseCase';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import { useRetirementPlanCmds } from './useRetirementPlanCmds';

vi.mock('@/application/retirement/use_cases/createRetirementPlanUseCase', () => ({
  createRetirementPlanUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/retirement/use_cases/updateRetirementPlanUseCase', () => ({
  updateRetirementPlanUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/retirement/use_cases/deleteRetirementPlanUseCase', () => ({
  deleteRetirementPlanUseCase: { execute: vi.fn() },
}));
vi.mock('@/ui/hooks/useAuthIdentity');

const auth = { uid: 'u1', email: 'user@example.com', isGlobalAdmin: false };

const mockCreate = vi.mocked(createRetirementPlanUseCase.execute);
const mockRename = vi.mocked(updateRetirementPlanUseCase.execute);
const mockDelete = vi.mocked(deleteRetirementPlanUseCase.execute);

const draft = {
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
};

describe('useRetirementPlanCmds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthIdentity).mockReturnValue(auth);
  });

  it('injects household and auth into every write', async () => {
    mockCreate.mockResolvedValue({ ok: true, id: 'plan-1' });
    mockRename.mockResolvedValue({ ok: true, name: 'New' });
    mockDelete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRetirementPlanCmds('h1'));

    await act(async () => {
      await result.current.createPlan(draft);
      await result.current.renamePlan('plan-1', 'New');
      await result.current.deletePlan('plan-1');
    });

    expect(mockCreate).toHaveBeenCalledWith({ ...draft, householdId: 'h1', auth });
    expect(mockRename).toHaveBeenCalledWith({
      householdId: 'h1',
      planId: 'plan-1',
      name: 'New',
      auth,
    });
    expect(mockDelete).toHaveBeenCalledWith({ householdId: 'h1', planId: 'plan-1', auth });
  });

  it('returns the inner domain outcome unchanged inside a successful run', async () => {
    mockRename.mockResolvedValue({ ok: false, code: 'PLAN_TOO_LARGE' });

    const { result } = renderHook(() => useRetirementPlanCmds('h1'));

    let outcome;
    await act(async () => {
      outcome = await result.current.renamePlan('plan-1', 'New');
    });

    expect(outcome).toMatchObject({ ok: true, value: { ok: false, code: 'PLAN_TOO_LARGE' } });
  });

  it('turns a thrown write into a failed run', async () => {
    mockRename.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useRetirementPlanCmds('h1'));

    let outcome;
    await act(async () => {
      outcome = await result.current.renamePlan('plan-1', 'New');
    });

    expect(outcome).toMatchObject({ ok: false, kind: 'failed' });
  });

  it('does not call the use cases without a household', async () => {
    const { result } = renderHook(() => useRetirementPlanCmds(undefined));

    await act(async () => {
      expect(await result.current.createPlan(draft)).toMatchObject({
        ok: true,
        value: { ok: false, code: 'PLAN_INVALID' },
      });
      expect(await result.current.renamePlan('plan-1', 'New')).toMatchObject({
        ok: true,
        value: { ok: false, code: 'PLAN_NOT_FOUND' },
      });
      await result.current.deletePlan('plan-1');
    });

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockRename).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
