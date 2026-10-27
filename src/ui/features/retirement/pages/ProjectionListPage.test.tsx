import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listProjectionsUseCase } from '@/application/retirement/use_cases/listProjectionsUseCase';
import { type ProjectionDocument } from '@/application/retirement/use_cases/listProjectionsUseCase';

import ProjectionListPage from './ProjectionListPage';

vi.mock('@/application/retirement/use_cases/listProjectionsUseCase', () => ({
  listProjectionsUseCase: { execute: vi.fn() },
}));

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({ userProfile: { uid: 'user-1', householdId: 'household-1' } }),
}));

const document = (overrides: Partial<ProjectionDocument> = {}): ProjectionDocument => ({
  id: 'projection-1',
  name: 'Base case',
  engineVersion: 1,
  createdAt: new Date('2026-03-02T00:00:00.000Z'),
  createdBy: 'author@test.com',
  retirementNetWorth: 1_000_000,
  finalNetWorth: 2_000_000,
  minNetWorth: 900_000,
  minNetWorthYear: 2040,
  bankruptcyYear: null,
  isBankrupt: false,
  ...overrides,
});

function renderList() {
  const router = createMemoryRouter(
    [
      { path: '/retirement', element: <ProjectionListPage /> },
      { path: '/retirement/new', element: <div>new projection</div> },
      { path: '/retirement/projections/:id', element: <div>projection view</div> },
    ],
    { initialEntries: ['/retirement'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('ProjectionListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listProjectionsUseCase.execute).mockResolvedValue([]);
  });

  it('renders the four columns in order with both status glyphs beside the name only', async () => {
    vi.mocked(listProjectionsUseCase.execute).mockResolvedValue([
      document({
        id: 'projection-2',
        name: 'Later',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
      }),
      document({
        id: 'projection-1',
        name: 'Bankrupt and stale',
        createdAt: new Date('2026-03-02T00:00:00.000Z'),
        engineVersion: 0,
        isBankrupt: true,
        bankruptcyYear: 2045,
      }),
    ]);

    renderList();

    const table = await screen.findByTestId('projection-table');
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((header) => header.textContent)).toEqual([
      'Name',
      'Created',
      'Net worth at retirement',
      'Final net worth',
    ]);

    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Later');
    expect(rows[1]).toHaveTextContent('Bankrupt and stale');

    const nameCell = within(rows[1]).getAllByRole('cell')[0];
    expect(nameCell).toHaveTextContent('BANKRUPT');
    expect(nameCell).toHaveTextContent('STALE');
    expect(within(rows[1]).getAllByRole('cell')[2]).not.toHaveTextContent('BANKRUPT');
  });

  it('shows an em dash for a null retirement net worth', async () => {
    vi.mocked(listProjectionsUseCase.execute).mockResolvedValue([
      document({ id: 'projection-1', retirementNetWorth: null }),
    ]);

    renderList();

    const row = await screen.findByTestId('projection-row-projection-1');
    expect(within(row).getAllByRole('cell')[2]).toHaveTextContent('—');
  });

  it('shows one sentence and one CTA in the empty state', async () => {
    renderList();

    expect(await screen.findByText('No projections have been calculated yet.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'NEW PROJECTION' })).toHaveLength(2);
  });

  it('sends the empty-state CTA to the start gate', async () => {
    const router = renderList();

    await screen.findByText('No projections have been calculated yet.');
    fireEvent.click(screen.getAllByRole('button', { name: 'NEW PROJECTION' })[1]);

    await waitFor(() => expect(router.state.location.pathname).toBe('/retirement/new'));
    expect(router.state.location.search).toBe('');
  });

  it('sends the header action to the start gate', async () => {
    const router = renderList();

    fireEvent.click((await screen.findAllByRole('button', { name: 'NEW PROJECTION' }))[0]);

    await waitFor(() => expect(router.state.location.pathname).toBe('/retirement/new'));
  });

  it('shows a skeleton first', () => {
    vi.mocked(listProjectionsUseCase.execute).mockImplementation(
      () => new Promise(() => undefined),
    );
    const { container } = render(
      <RouterProvider
        router={createMemoryRouter([{ path: '/', element: <ProjectionListPage /> }], {
          initialEntries: ['/'],
        })}
      />,
    );

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows a warning and retries the load', async () => {
    vi.mocked(listProjectionsUseCase.execute)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([document()]);

    renderList();

    expect(await screen.findByText('Could not load projections.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RETRY' }));

    expect(await screen.findByTestId('projection-row-projection-1')).toBeInTheDocument();
    expect(listProjectionsUseCase.execute).toHaveBeenCalledTimes(2);
  });
});
