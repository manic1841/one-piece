import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { calculateProjectionUseCase } from '@/application/retirement/use_cases/calculateProjectionUseCase';
import { deleteProjectionUseCase } from '@/application/retirement/use_cases/deleteProjectionUseCase';
import { persistProjectionUseCase } from '@/application/retirement/use_cases/persistProjectionUseCase';
import { renameProjectionNameUseCase } from '@/application/retirement/use_cases/renameProjectionNameUseCase';
import { saveProjectionAsPlanUseCase } from '@/application/retirement/use_cases/saveProjectionAsPlanUseCase';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import { useProjectionCmds } from './useProjectionCmds';

vi.mock('@/application/retirement/use_cases/calculateProjectionUseCase', () => ({
  calculateProjectionUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/retirement/use_cases/persistProjectionUseCase', () => ({
  persistProjectionUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/retirement/use_cases/renameProjectionNameUseCase', () => ({
  renameProjectionNameUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/retirement/use_cases/deleteProjectionUseCase', () => ({
  deleteProjectionUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/retirement/use_cases/saveProjectionAsPlanUseCase', () => ({
  saveProjectionAsPlanUseCase: { execute: vi.fn() },
}));
vi.mock('@/ui/hooks/useAuthIdentity');

const auth = { uid: 'u1', email: 'user@example.com', isGlobalAdmin: false };

const mockCalculate = vi.mocked(calculateProjectionUseCase.execute);
const mockPersist = vi.mocked(persistProjectionUseCase.execute);
const mockRename = vi.mocked(renameProjectionNameUseCase.execute);
const mockDelete = vi.mocked(deleteProjectionUseCase.execute);
const mockSaveAsPlan = vi.mocked(saveProjectionAsPlanUseCase.execute);

const calculation = { startYear: 2026 } as never;

describe('useProjectionCmds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthIdentity).mockReturnValue(auth);
  });

  it('injects household and auth into every write', async () => {
    mockCalculate.mockResolvedValue({ ok: false, code: 'PROJECTION_VALIDATION_FAILED' });
    mockPersist.mockResolvedValue({ ok: true, id: 'p1' });
    mockRename.mockResolvedValue({ ok: true, name: 'New' });
    mockDelete.mockResolvedValue(undefined);
    mockSaveAsPlan.mockResolvedValue({ ok: true, id: 'plan-1' });

    const { result } = renderHook(() => useProjectionCmds('h1'));

    await act(async () => {
      await result.current.calculate({
        startYear: 2026,
        opening: { source: 'manual', amount: 1 },
        assumptions: {} as never,
        rules: [],
        lifeEvents: [],
      });
      await result.current.persist({ name: 'P', calculation });
      await result.current.renameProjection('p1', 'New');
      await result.current.deleteProjection('p1');
      await result.current.saveProjectionAsPlan('p1', 'Plan');
    });

    expect(mockCalculate).toHaveBeenCalledWith(
      expect.objectContaining({ householdId: 'h1', auth, startYear: 2026 }),
    );
    expect(mockPersist).toHaveBeenCalledWith({ name: 'P', calculation, householdId: 'h1', auth });
    expect(mockRename).toHaveBeenCalledWith({
      householdId: 'h1',
      projectionId: 'p1',
      name: 'New',
      auth,
    });
    expect(mockDelete).toHaveBeenCalledWith({ householdId: 'h1', projectionId: 'p1', auth });
    expect(mockSaveAsPlan).toHaveBeenCalledWith({
      householdId: 'h1',
      projectionId: 'p1',
      name: 'Plan',
      auth,
    });
  });

  it('reports a write failure as a failed run instead of throwing', async () => {
    mockSaveAsPlan.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useProjectionCmds('h1'));

    let outcome;
    await act(async () => {
      outcome = await result.current.saveProjectionAsPlan('p1', 'Plan');
    });

    expect(outcome).toMatchObject({ ok: false, kind: 'failed', error: expect.any(Error) });
  });

  it('does not call the use cases without a household', async () => {
    const { result } = renderHook(() => useProjectionCmds(undefined));

    await act(async () => {
      expect(await result.current.persist({ name: 'P', calculation })).toMatchObject({
        ok: true,
        value: { ok: false },
      });
      await result.current.deleteProjection('p1');
      expect(await result.current.saveProjectionAsPlan('p1', 'Plan')).toMatchObject({
        ok: true,
        value: { ok: false, code: 'PROJECTION_NOT_FOUND' },
      });
    });

    expect(mockPersist).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockSaveAsPlan).not.toHaveBeenCalled();
  });
});
