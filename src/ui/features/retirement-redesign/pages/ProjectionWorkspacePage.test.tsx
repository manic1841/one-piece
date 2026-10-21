import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getStartingNetWorthUseCase } from '@/application/retirement/use_cases/getStartingNetWorthUseCase';

import ProjectionWorkspacePage from './ProjectionWorkspacePage';

vi.mock('@/application/retirement/use_cases/getStartingNetWorthUseCase', () => ({
  getStartingNetWorthUseCase: { execute: vi.fn() },
}));

const { authMock } = vi.hoisted(() => ({
  authMock: { uid: 'user-1', email: 'user@example.com', isGlobalAdmin: false },
}));

vi.mock('@/ui/hooks/useAuthIdentity', () => ({ useAuthIdentity: () => authMock }));

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({
    userProfile: { uid: 'user-1', householdId: 'household-1' },
  }),
}));

const { confirmMock } = vi.hoisted(() => ({ confirmMock: vi.fn() }));

vi.mock('@/ui/components/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));

const closedResult = {
  startingNetWorth: 380_000,
  anchorYearMonth: '2026-08',
  assets: 500_000,
  liabilities: 120_000,
};

function renderWorkspace() {
  const router = createMemoryRouter(
    [
      { path: '/retirement/new', element: <ProjectionWorkspacePage /> },
      { path: '/other', element: <div>other</div> },
    ],
    { initialEntries: ['/retirement/new'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('ProjectionWorkspacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmMock.mockResolvedValue(false);
  });

  it('renders the fixed content order in one column', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue(closedResult);

    renderWorkspace();
    await screen.findByText(/As of 2026-08/);

    const headings = screen.getAllByText(
      /OPENING NET WORTH|ASSUMPTIONS|PROJECTION RULES|LIFE EVENTS/,
    );
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'OPENING NET WORTH',
      '01 / ASSUMPTIONS',
      '02 / PROJECTION RULES',
      '03 / LIFE EVENTS',
    ]);
  });

  it('keeps the route when switching to preview and makes the inputs read-only', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue(closedResult);

    const router = renderWorkspace();
    await screen.findByText(/As of 2026-08/);

    fireEvent.click(screen.getByRole('button', { name: 'PREVIEW' }));

    expect(screen.getByText(/Preview is read-only/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SAVE' })).toBeDisabled();
    expect(screen.getByLabelText('Opening net worth')).toHaveAttribute('readonly');
    expect(router.state.location.pathname).toBe('/retirement/new');

    fireEvent.click(screen.getByRole('button', { name: 'BACK TO SETUP' }));

    expect(screen.getByRole('button', { name: 'PREVIEW' })).toBeInTheDocument();
    expect(screen.queryByText(/Preview is read-only/)).not.toBeInTheDocument();
  });

  it('keeps the derived value read-only and anchored to the source month', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue(closedResult);

    renderWorkspace();
    await screen.findByText(/As of 2026-08/);

    expect(screen.getByLabelText('Opening net worth')).toHaveValue(380000);
    expect(screen.getByLabelText('Opening net worth')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'USE MANUAL VALUE' })).toBeInTheDocument();
  });

  it('shows the empty sentence and ENTER MANUALLY when no period is closed', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue({
      reason: 'NO_CLOSED_PERIOD',
    });

    renderWorkspace();

    await screen.findByText('No closed period yet.');
    expect(screen.getByLabelText('Opening net worth')).toHaveValue(null);

    fireEvent.click(screen.getByRole('button', { name: 'ENTER MANUALLY' }));

    expect(screen.getByLabelText('Opening net worth')).not.toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'ENTER MANUALLY' })).not.toBeInTheDocument();
  });

  it('asks before leaving once an edit has been made', async () => {
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue(closedResult);

    const router = renderWorkspace();
    await screen.findByText(/As of 2026-08/);

    fireEvent.click(screen.getByRole('button', { name: 'USE MANUAL VALUE' }));
    fireEvent.change(screen.getByLabelText('Opening net worth'), {
      target: { value: '100' },
    });

    await act(async () => {
      void router.navigate('/other');
    });

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(router.state.location.pathname).toBe('/retirement/new');
  });
});
