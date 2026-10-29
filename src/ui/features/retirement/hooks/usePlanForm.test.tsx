import { type ReactNode } from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlanDrafts } from '@/ui/features/retirement/hooks/usePlanDrafts';
import { usePlanResource } from '@/ui/features/retirement/hooks/usePlanResource';
import { useRetirementPlanAccess } from '@/ui/features/retirement/hooks/useRetirementPlanAccess';
import { useSaveNameForms } from '@/ui/features/retirement/hooks/useSaveNameForms';
import { draftGroup } from '@/ui/features/retirement/testing/planFormFixture';

import { usePlanForm } from './usePlanForm';

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
vi.mock('@/ui/features/retirement/hooks/usePlanResource');
vi.mock('@/ui/features/retirement/hooks/useRetirementPlanAccess');
vi.mock('@/ui/features/retirement/hooks/useSaveNameForms');
vi.mock('@/ui/features/retirement/hooks/useWorkspaceLeaveGuard', () => ({
  useWorkspaceLeaveGuard: vi.fn(),
}));
vi.mock('@/ui/features/retirement/hooks/usePlanDrafts');

const mockResource = vi.mocked(usePlanResource);
const mockAccess = vi.mocked(useRetirementPlanAccess);
const mockDrafts = vi.mocked(usePlanDrafts);
const mockForms = vi.mocked(useSaveNameForms);
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

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

const parsed = { assumptions: {}, projectionRules: [], lifeEvents: [] };

const forms = (overrides: Record<string, unknown> = {}) => ({
  planForm: { reset: vi.fn() },
  submitPlanForm: (onSubmit: (name: string) => Promise<unknown>) => onSubmit('Retire early'),
  ...overrides,
});

const drafts = (overrides: Record<string, unknown> = {}) => ({
  dirty: false,
  assumptions: { ...draftGroup(), resetFrom: vi.fn(), revealAll: vi.fn(), validate: vi.fn() },
  rules: { ...draftGroup(), replaceAll: vi.fn(), revealAll: vi.fn(), validate: vi.fn() },
  events: { ...draftGroup(), replaceAll: vi.fn(), revealAll: vi.fn(), validate: vi.fn() },
  preview: {},
  undo: { canUndo: false, run: vi.fn() },
  sectionState: () => ({}),
  rememberEvents: vi.fn(),
  replaceAll: vi.fn(),
  takeValidated: vi.fn().mockReturnValue(parsed),
  ...overrides,
});

/** The wrapper's whereabouts after a submit, as the router sees them. */
const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;

const render = (submit = vi.fn()) =>
  renderHook(
    () =>
      usePlanForm({
        householdId: 'h1',
        submit,
        invalidMessage: 'Fix the errors.',
        fallbackMessage: 'Could not save.',
        successMessage: 'Plan saved.',
      }),
    { wrapper },
  );

const editResource = () => ({
  planId: 'plan-1',
  plan,
  setPlan: vi.fn(),
  loading: false,
  errorMessage: null,
  notFound: false,
  reload: vi.fn(),
});

describe('usePlanForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccess.mockReturnValue({ canManage: true, loading: false });
    mockResource.mockReturnValue(editResource() as never);
    mockDrafts.mockReturnValue(drafts() as never);
    mockForms.mockReturnValue(forms() as never);
  });

  it('seeds the drafts and the name from the loaded plan exactly once', async () => {
    const seeded = drafts();
    mockDrafts.mockReturnValue(seeded as never);
    const { rerender } = render();

    await waitFor(() => expect(seeded.replaceAll).toHaveBeenCalledTimes(1));
    expect(seeded.replaceAll).toHaveBeenCalledWith({
      assumptions: plan.assumptions,
      projectionRules: plan.projectionRules,
      lifeEvents: plan.lifeEvents,
    });

    rerender();
    await waitFor(() => expect(seeded.replaceAll).toHaveBeenCalledTimes(1));
  });

  it('leaves the birth year unlocked when there is no plan to seed', async () => {
    mockResource.mockReturnValue({
      ...editResource(),
      planId: null,
      plan: null,
    } as never);
    const open = drafts();
    mockDrafts.mockReturnValue(open as never);

    render();

    expect(open.assumptions.resetFrom).not.toHaveBeenCalled();
  });

  it('reports the not-found state only when the route names a plan', () => {
    mockResource.mockReturnValue({ ...editResource(), plan: null, notFound: true } as never);
    expect(render().result.current.notFound).toBe(true);

    mockResource.mockReturnValue({
      ...editResource(),
      planId: null,
      plan: null,
      notFound: true,
    } as never);
    expect(render().result.current.notFound).toBe(false);
  });

  it('hands the manager a writable form and everyone else a read-only one', () => {
    expect(render().result.current.readOnly).toBe(false);

    mockAccess.mockReturnValue({ canManage: false, loading: false });
    expect(render().result.current.readOnly).toBe(true);
  });

  it('writes nothing and reports the abort when a draft is invalid', async () => {
    const submit = vi.fn();
    mockDrafts.mockReturnValue(drafts({ takeValidated: vi.fn().mockReturnValue(null) }) as never);

    const { result } = render(submit);
    const outcome = await result.current.submit();

    expect(outcome).toEqual({ ok: false, messages: ['Fix the errors.'] });
    expect(submit).not.toHaveBeenCalled();
  });

  it('maps a write failure code to its message and keeps the dialog open', async () => {
    const submit = vi
      .fn()
      .mockResolvedValue({ ok: true, value: { ok: false, code: 'NAME_TOO_LONG' } });

    const { result } = render(submit);
    const outcome = await result.current.submit();

    expect(outcome).toEqual({ ok: false, messages: ['Plan name is too long.'] });
    expect(result.current.saved).toBe(false);
  });

  it('falls back to the caller message for an unmapped code', async () => {
    const submit = vi
      .fn()
      .mockResolvedValue({ ok: true, value: { ok: false, code: 'SOMETHING_NEW' } });

    const { result } = render(submit);
    const outcome = await result.current.submit();

    expect(outcome).toEqual({ ok: false, messages: ['Could not save.'] });
  });

  it('writes the whole draft and marks the form saved before it leaves', async () => {
    const submit = vi
      .fn()
      .mockResolvedValue({ ok: true, value: { ok: true, name: 'Retire early' } });

    const { result } = render(submit);
    const outcome = await result.current.submit();

    expect(outcome).toEqual({ ok: true });
    expect(submit).toHaveBeenCalledWith('Retire early', parsed);
    await waitFor(() => expect(result.current.saved).toBe(true));
    expect(mockNavigate).toHaveBeenCalledWith('/retirement/plans/plan-1', { replace: true });
    expect(toast.success).toHaveBeenCalledWith('Plan saved.');
  });

  it('lands on the plan it just created when the route named none', async () => {
    mockResource.mockReturnValue({ ...editResource(), planId: null, plan: null } as never);
    const submit = vi.fn().mockResolvedValue({ ok: true, value: { ok: true, id: 'plan-2' } });

    const { result } = render(submit);
    await result.current.submit();

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/retirement/plans/plan-2', { replace: true }),
    );
  });

  it('keeps the form reachable after an infrastructure failure', async () => {
    const submit = vi
      .fn()
      .mockResolvedValue({ ok: false, kind: 'failed', error: new Error('offline') });

    const { result } = render(submit);
    const outcome = await result.current.submit();

    expect(outcome).toEqual({ ok: false, messages: ['offline'] });
    expect(result.current.saved).toBe(false);
  });
});
