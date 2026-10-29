import { type ReactNode } from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlanDraftForm } from '@/ui/features/retirement/hooks/usePlanDraftForm';
import { usePlanResource } from '@/ui/features/retirement/hooks/usePlanResource';
import { useRetirementPlanAccess } from '@/ui/features/retirement/hooks/useRetirementPlanAccess';
import { useRetirementPlanCmds } from '@/ui/features/retirement/hooks/useRetirementPlanCmds';
import { useRetirementPlanEdit } from '@/ui/features/retirement/hooks/useRetirementPlanEdit';
import { useSaveNameForms } from '@/ui/features/retirement/hooks/useSaveNameForms';
import { draftGroup } from '@/ui/features/retirement/testing/planFormFixture';

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
vi.mock('@/ui/features/retirement/hooks/usePlanResource');
vi.mock('@/ui/features/retirement/hooks/useRetirementPlanAccess');
vi.mock('@/ui/features/retirement/hooks/useRetirementPlanCmds');
vi.mock('@/ui/features/retirement/hooks/useSaveNameForms');
vi.mock('@/ui/features/retirement/hooks/useWorkspaceLeaveGuard', () => ({
  useWorkspaceLeaveGuard: vi.fn(),
}));
vi.mock('@/ui/features/retirement/hooks/usePlanDraftForm');

const mockResource = vi.mocked(usePlanResource);
const mockAccess = vi.mocked(useRetirementPlanAccess);
const mockCmds = vi.mocked(useRetirementPlanCmds);
const mockDrafts = vi.mocked(usePlanDraftForm);
const mockForms = vi.mocked(useSaveNameForms);

const plan = {
  id: 'plan-1',
  name: 'Retire early',
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

const cmds = (overrides: Record<string, unknown> = {}) => ({
  updatePlan: vi.fn(),
  ...overrides,
});

const forms = (overrides: Record<string, unknown> = {}) => ({
  planForm: { reset: vi.fn() },
  submitPlanForm: (onSubmit: (name: string) => Promise<unknown>) => onSubmit('Retire early'),
  ...overrides,
});

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;

const drafts = (overrides: Record<string, unknown> = {}) => ({
  dirty: false,
  assumptions: { ...draftGroup(), resetFrom: vi.fn(), revealAll: vi.fn(), validate: vi.fn() },
  rules: { ...draftGroup(), replaceAll: vi.fn(), revealAll: vi.fn(), validate: vi.fn() },
  events: { ...draftGroup(), replaceAll: vi.fn(), revealAll: vi.fn(), validate: vi.fn() },
  preview: {},
  undo: { canUndo: false, run: vi.fn() },
  sectionState: {},
  rememberEvents: vi.fn(),
  validateAll: vi.fn(),
  ...overrides,
});

describe('useRetirementPlanEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccess.mockReturnValue({ canManage: true, loading: false });
    mockResource.mockReturnValue({
      planId: 'plan-1',
      plan,
      setPlan: vi.fn(),
      back: '/retirement/plans/plan-1',
      loading: false,
      errorMessage: null,
      notFound: false,
      reload: vi.fn(),
    } as never);
    mockDrafts.mockReturnValue(drafts() as never);
    mockCmds.mockReturnValue(cmds() as never);
    mockForms.mockReturnValue(forms() as never);
  });

  it('seeds the drafts and the name from the loaded plan exactly once', async () => {
    const seeded = drafts();
    mockDrafts.mockReturnValue(seeded as never);
    const { rerender } = renderHook(() => useRetirementPlanEdit('h1'), { wrapper });

    await waitFor(() => expect(seeded.assumptions.resetFrom).toHaveBeenCalledTimes(1));
    expect(seeded.rules.replaceAll).toHaveBeenCalledWith(plan.projectionRules);
    expect(seeded.events.replaceAll).toHaveBeenCalledWith(plan.lifeEvents);

    rerender();
    await waitFor(() => expect(seeded.assumptions.resetFrom).toHaveBeenCalledTimes(1));
  });

  it('locks the birth year once a plan is seeded', async () => {
    const seeded = drafts();
    mockDrafts.mockReturnValue(seeded as never);
    renderHook(() => useRetirementPlanEdit('h1'), { wrapper });

    await waitFor(() => expect(seeded.assumptions.resetFrom).toHaveBeenCalled());
  });

  it('writes nothing and reports the abort when a draft is invalid', async () => {
    const updatePlan = vi.fn();
    mockCmds.mockReturnValue(cmds({ updatePlan }) as never);
    const seeded = drafts({ validateAll: vi.fn().mockReturnValue(null) });
    mockDrafts.mockReturnValue(seeded as never);

    const { result } = renderHook(() => useRetirementPlanEdit('h1'), { wrapper });
    const outcome = await result.current.submit();

    expect(outcome).toEqual({
      ok: false,
      messages: ['Fix the validation errors before saving the plan.'],
    });
    expect(updatePlan).not.toHaveBeenCalled();
  });

  it('reports a missing plan id instead of failing silently', async () => {
    mockResource.mockReturnValue({ planId: null, plan: null } as never);

    const { result } = renderHook(() => useRetirementPlanEdit('h1'), { wrapper });
    const outcome = await result.current.submit();

    expect(outcome).toEqual({ ok: false, messages: ['This plan no longer exists.'] });
  });
});
