import { act, render, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getStartingNetWorthUseCase } from '@/application/retirement/use_cases/getStartingNetWorthUseCase';
import { type RetirementPlanWorkspaceData } from '@/application/retirement/use_cases/retirementPlanLookup';

import { useProjectionWorkspace } from './useProjectionWorkspace';

vi.mock('@/application/retirement/use_cases/getStartingNetWorthUseCase', () => ({
  getStartingNetWorthUseCase: { execute: vi.fn() },
}));

const { authMock } = vi.hoisted(() => ({
  authMock: { uid: 'user-1', email: 'user@example.com', isGlobalAdmin: false },
}));

vi.mock('@/ui/hooks/useAuthIdentity', () => ({ useAuthIdentity: () => authMock }));

const { confirmMock } = vi.hoisted(() => ({ confirmMock: vi.fn() }));

vi.mock('@/ui/components/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));

const latestRef = { current: null as unknown as ReturnType<typeof useProjectionWorkspace> };

function Harness() {
  // The harness publishes the latest controller value to the test, like a
  // render-prop; the rule cannot know this module-level holder is intentional.
  // eslint-disable-next-line react-hooks/immutability
  latestRef.current = useProjectionWorkspace('household-1');
  return <div data-testid="stage">{latestRef.current.stage}</div>;
}

function renderWorkspace() {
  const router = createMemoryRouter(
    [
      { path: '/retirement/new', element: <Harness /> },
      { path: '/other', element: <div>other</div> },
    ],
    { initialEntries: ['/retirement/new'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const closedResult = {
  startingNetWorth: 380_000,
  anchorYearMonth: '2026-08',
  assets: 500_000,
  liabilities: 120_000,
};

describe('useProjectionWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmMock.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('seeds the derived opening balance from the latest CLOSED period without dirtying', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue(closedResult);

    renderWorkspace();

    await waitFor(() => expect(latestRef.current.opening.amountText).toBe('380000'));
    expect(latestRef.current.opening).toEqual({
      source: 'derived',
      amountText: '380000',
      anchorYearMonth: '2026-08',
    });
    expect(latestRef.current.dirty).toBe(false);
  });

  it('starts empty and offers manual entry when no period is closed', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue({
      reason: 'NO_CLOSED_PERIOD',
    });

    renderWorkspace();

    await waitFor(() => expect(latestRef.current.openingLoading).toBe(false));
    expect(latestRef.current.opening).toEqual({
      source: 'derived',
      amountText: '',
      anchorYearMonth: null,
    });
    expect(latestRef.current.hasClosedPeriod).toBe(false);
    expect(latestRef.current.dirty).toBe(false);
  });

  it('switching to manual clears the anchor and marks the workspace dirty', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue(closedResult);

    renderWorkspace();
    await waitFor(() => expect(latestRef.current.opening.amountText).toBe('380000'));

    act(() => latestRef.current.enterManual());

    expect(latestRef.current.opening).toEqual({
      source: 'manual',
      amountText: '380000',
      anchorYearMonth: null,
    });
    expect(latestRef.current.dirty).toBe(true);
  });

  it('editing the amount marks the workspace dirty', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue(closedResult);

    renderWorkspace();
    await waitFor(() => expect(latestRef.current.openingLoading).toBe(false));

    act(() => latestRef.current.setOpeningAmount('-1200'));

    expect(latestRef.current.opening.amountText).toBe('-1200');
    expect(latestRef.current.dirty).toBe(true);
  });

  it('restoring the report value keeps the derived anchor and the dirty flag', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue(closedResult);

    renderWorkspace();
    await waitFor(() => expect(latestRef.current.opening.amountText).toBe('380000'));

    act(() => {
      latestRef.current.enterManual();
      latestRef.current.setOpeningAmount('1');
    });
    act(() => latestRef.current.useReportValue());

    expect(latestRef.current.opening).toEqual({
      source: 'derived',
      amountText: '380000',
      anchorYearMonth: '2026-08',
    });
    expect(latestRef.current.dirty).toBe(true);
  });

  it('switching stages keeps the route and the draft', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue(closedResult);

    const router = renderWorkspace();
    await waitFor(() => expect(latestRef.current.openingLoading).toBe(false));

    act(() => latestRef.current.setOpeningAmount('42'));
    act(() => latestRef.current.goToPreview());

    expect(latestRef.current.stage).toBe('preview');
    expect(latestRef.current.opening.amountText).toBe('42');
    expect(router.state.location.pathname).toBe('/retirement/new');

    act(() => latestRef.current.backToSetup());
    expect(latestRef.current.stage).toBe('setup');
  });

  it('includes the event group in setup validation and replacement', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue(closedResult);

    renderWorkspace();
    await waitFor(() => expect(latestRef.current.openingLoading).toBe(false));

    act(() => latestRef.current.events.add());
    expect(latestRef.current.valid).toBe(false);
    expect(latestRef.current.validate().events.ok).toBe(false);

    const plan: RetirementPlanWorkspaceData = {
      id: 'plan-1',
      name: 'Plan',
      assumptions: {
        birthYear: 1970,
        retirementAge: 55,
        lifeExpectancy: 90,
        inflationRate: 0.02,
        annualReturnRate: 0.05,
      },
      rules: [],
      lifeEvents: [
        {
          id: 'event-1',
          name: 'Trip',
          type: 'expense',
          enabled: true,
          phases: [{ startYear: 2040, endYear: 2041, amount: 10 }],
        },
      ],
    };

    act(() => latestRef.current.applyPlan(plan));

    expect(latestRef.current.events.events).toHaveLength(1);
    expect(latestRef.current.events.events[0].name).toBe('Trip');
  });

  it('registers beforeunload only while dirty', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue(closedResult);

    renderWorkspace();
    await waitFor(() => expect(latestRef.current.openingLoading).toBe(false));

    const cleanEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);

    act(() => latestRef.current.setOpeningAmount('5'));

    const dirtyEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);
  });

  it('asks before leaving and stays when the confirmation is cancelled', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue(closedResult);

    const router = renderWorkspace();
    await waitFor(() => expect(latestRef.current.openingLoading).toBe(false));
    act(() => latestRef.current.setOpeningAmount('5'));

    await act(async () => {
      void router.navigate('/other');
    });

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(router.state.location.pathname).toBe('/retirement/new');
  });

  it('leaves when the confirmation is accepted', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue(closedResult);
    confirmMock.mockResolvedValue(true);

    const router = renderWorkspace();
    await waitFor(() => expect(latestRef.current.openingLoading).toBe(false));
    act(() => latestRef.current.setOpeningAmount('5'));

    await act(async () => {
      void router.navigate('/other');
    });

    await waitFor(() => expect(router.state.location.pathname).toBe('/other'));
  });

  it('does not ask to leave a clean workspace', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue(closedResult);

    const router = renderWorkspace();
    await waitFor(() => expect(latestRef.current.openingLoading).toBe(false));

    await act(async () => {
      await router.navigate('/other');
    });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe('/other');
  });
});
