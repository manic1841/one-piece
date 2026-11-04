import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getRetirementPlanUseCase } from '@/application/retirement/use_cases/getRetirementPlanUseCase';
import { type RetirementPlan } from '@/domains/retirement/types';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import { usePlanResource } from './usePlanResource';

const state = vi.hoisted(() => ({ planId: 'plan-a' }));

vi.mock('@/application/retirement/use_cases/getRetirementPlanUseCase', () => ({
  getRetirementPlanUseCase: { execute: vi.fn() },
}));

vi.mock('@/ui/hooks/useAuthIdentity', () => ({ useAuthIdentity: vi.fn() }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ id: state.planId }) };
});

const mockGet = vi.mocked(getRetirementPlanUseCase.execute);
const mockAuth = vi.mocked(useAuthIdentity);

const plan = (id: string) => ({ id, name: id }) as RetirementPlan;

/** A promise the test settles by hand, to control completion order. */
function deferred() {
  let resolve!: (value: RetirementPlan) => void;
  const promise = new Promise<RetirementPlan>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('usePlanResource', () => {
  beforeEach(() => {
    state.planId = 'plan-a';
    mockGet.mockReset();
    mockAuth.mockReturnValue({ uid: 'u1' } as ReturnType<typeof useAuthIdentity>);
  });

  it('keeps the newer plan when the earlier route finishes last', async () => {
    const slowA = deferred();
    const fastB = deferred();
    mockGet.mockImplementation((({ planId }: { planId: string }) =>
      planId === 'plan-a' ? slowA.promise : fastB.promise) as never);

    const { result, rerender } = renderHook(() => usePlanResource('household-1'));

    state.planId = 'plan-b';
    rerender();
    await act(async () => fastB.resolve(plan('plan-b')));
    await waitFor(() => expect(result.current.plan?.id).toBe('plan-b'));

    // A settles after B: without the per-effect abort this overwrites B.
    await act(async () => slowA.resolve(plan('plan-a')));

    expect(result.current.plan?.id).toBe('plan-b');
    expect(result.current.planId).toBe('plan-b');
  });

  it('does not render the previous plan while the new route loads', async () => {
    mockGet.mockImplementation((({ planId }: { planId: string }) =>
      planId === 'plan-a' ? Promise.resolve(plan('plan-a')) : deferred().promise) as never);

    const { result, rerender } = renderHook(() => usePlanResource('household-1'));
    await waitFor(() => expect(result.current.plan?.id).toBe('plan-a'));

    state.planId = 'plan-b';
    rerender();

    expect(result.current.plan).toBeNull();
    expect(result.current.planId).toBe('plan-b');
    // The committed render precedes the effect that starts B's read; the page
    // must not flash the not-found state for that frame.
    expect(result.current.notFound).toBe(false);
  });

  it('reports not found once the read settles without a plan', async () => {
    mockGet.mockResolvedValue(null as never);

    const { result } = renderHook(() => usePlanResource('household-1'));

    await waitFor(() => expect(result.current.notFound).toBe(true));
  });

  it('keeps the newer plan when a manual retry of the old route lands late', async () => {
    const retried = deferred();
    const routeB = deferred();
    let routeACalls = 0;
    mockGet.mockImplementation((({ planId }: { planId: string }) => {
      if (planId === 'plan-b') return routeB.promise;
      routeACalls += 1;
      return routeACalls === 1 ? Promise.resolve(plan('plan-a')) : retried.promise;
    }) as never);

    const { result, rerender } = renderHook(() => usePlanResource('household-1'));
    await waitFor(() => expect(result.current.plan?.id).toBe('plan-a'));

    // The user retries on A, then navigates to B before the retry settles.
    act(() => {
      void result.current.reload();
    });
    state.planId = 'plan-b';
    rerender();
    await act(async () => routeB.resolve(plan('plan-b')));
    await waitFor(() => expect(result.current.plan?.id).toBe('plan-b'));

    await act(async () => retried.resolve(plan('plan-a')));

    expect(result.current.plan?.id).toBe('plan-b');
  });
});
