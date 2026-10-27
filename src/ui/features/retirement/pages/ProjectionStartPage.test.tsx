import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProjectionStartPage from './ProjectionStartPage';

vi.mock('./ProjectionWorkspacePage', () => ({ default: () => <div>workspace body</div> }));

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({ userProfile: { uid: 'user-1', householdId: 'household-1' } }),
}));

const { planLibraryMock } = vi.hoisted(() => ({
  planLibraryMock: {
    plans: [] as Array<{
      id: string;
      name: string;
      retirementAge: number;
      lifeExpectancy: number;
      inflationRate: number;
      annualReturnRate: number;
      updatedAt: Date;
    }>,
    loading: false,
    error: null as unknown,
    refresh: vi.fn(),
  },
}));

vi.mock('@/ui/features/retirement/hooks/usePlanLibrary', () => ({
  usePlanLibrary: () => planLibraryMock,
}));

const planOption = (id: string, name: string) => ({
  id,
  name,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflationRate: 0.02,
  annualReturnRate: 0.05,
  updatedAt: new Date('2026-03-02T00:00:00.000Z'),
});

function renderGate(initialEntry = '/retirement/new') {
  const router = createMemoryRouter(
    [
      { path: '/retirement', element: <div>projection list</div> },
      { path: '/retirement/plans', element: <div>plan list</div> },
      { path: '/retirement/new', element: <ProjectionStartPage /> },
    ],
    { initialEntries: ['/retirement', '/retirement/plans', initialEntry], initialIndex: 2 },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('ProjectionStartPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    planLibraryMock.plans = [];
    planLibraryMock.loading = false;
    planLibraryMock.error = null;
  });

  it('asks for a start choice and keeps START BLANK the primary action', () => {
    renderGate();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('NEW PROJECTION');
    expect(screen.getByRole('button', { name: 'START BLANK' })).toHaveClass('bg-primary');
  });

  it('starts blank through the query so the gate is not replayed', async () => {
    const router = renderGate();

    fireEvent.click(screen.getByRole('button', { name: 'START BLANK' }));

    await waitFor(() => expect(router.state.location.search).toBe('?start=blank'));
    expect(screen.getByText('workspace body')).toBeInTheDocument();
  });

  it('starts from a chosen plan and carries its id in the query', async () => {
    planLibraryMock.plans = [planOption('plan-1', 'Early retirement')];
    const router = renderGate();

    fireEvent.click(await screen.findByTestId('plan-option-plan-1'));

    await waitFor(() => expect(router.state.location.search).toBe('?plan=plan-1'));
  });

  it('shows each plan with its assumptions and last update', async () => {
    planLibraryMock.plans = [planOption('plan-1', 'Early retirement')];
    renderGate();

    const row = await screen.findByTestId('plan-option-plan-1');
    expect(row).toHaveTextContent('Retires at 60 · Lives to 85 · Inflation 2.0% · Return 5.0%');
    expect(row).toHaveTextContent('2026-03-02');
  });

  it('keeps START BLANK enabled with no plans and says the plan list is elsewhere', async () => {
    renderGate();

    expect(
      await screen.findByText('No saved plans yet. Create one in Plans, then come back.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'GO TO PLANS' })).toHaveAttribute(
      'href',
      '/retirement/plans',
    );
    expect(screen.getByRole('button', { name: 'START BLANK' })).toBeEnabled();
  });

  it('warns on a failed plan load and retries without blocking START BLANK', async () => {
    planLibraryMock.error = new Error('boom');
    renderGate();

    expect(await screen.findByText('Could not load plans.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'START BLANK' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'RETRY' }));
    expect(planLibraryMock.refresh).toHaveBeenCalledTimes(1);
  });

  it('shows skeleton plan rows while the library loads', async () => {
    planLibraryMock.loading = true;
    renderGate();

    expect(await screen.findByTestId('plan-options-loading')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'START BLANK' })).toBeEnabled();
  });

  it('leaves through history', async () => {
    Object.defineProperty(window.history, 'length', { value: 5, configurable: true });
    const router = renderGate();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/retirement/plans'));
  });

  it('falls back to the list when there is no history', async () => {
    Object.defineProperty(window.history, 'length', { value: 1, configurable: true });
    const router = renderGate();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/retirement'));
  });

  it.each(['plan=plan-1', 'from=projection-1', 'start=blank', 'applied='])(
    'skips the gate when ?%s is present',
    (query) => {
      renderGate(`/retirement/new?${query}`);

      expect(screen.getByText('workspace body')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'START BLANK' })).not.toBeInTheDocument();
    },
  );

  it('stays in the workspace once the query collapses to the applied marker', async () => {
    const router = renderGate('/retirement/new?plan=plan-1');
    expect(screen.getByText('workspace body')).toBeInTheDocument();

    await act(async () => {
      await router.navigate('/retirement/new?applied=');
    });

    expect(screen.getByText('workspace body')).toBeInTheDocument();
  });

  it('reopens the gate when the workspace asks to change plan', async () => {
    const router = renderGate('/retirement/new?plan=plan-1');

    await act(async () => {
      await router.navigate('/retirement/new?pick');
    });

    expect(screen.getByRole('button', { name: 'START BLANK' })).toBeInTheDocument();
  });
});
