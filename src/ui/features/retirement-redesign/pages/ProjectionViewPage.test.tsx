import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteProjectionUseCase } from '@/application/retirement/use_cases/deleteProjectionUseCase';
import {
  type ProjectionViewData,
  getProjectionViewUseCase,
} from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { renameProjectionNameUseCase } from '@/application/retirement/use_cases/renameProjectionNameUseCase';
import { saveProjectionAsPlanUseCase } from '@/application/retirement/use_cases/saveProjectionAsPlanUseCase';

import ProjectionViewPage from './ProjectionViewPage';

vi.mock('@/application/retirement/use_cases/getProjectionViewUseCase', () => ({
  getProjectionViewUseCase: { execute: vi.fn() },
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

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({ userProfile: { uid: 'user-1', householdId: 'household-1' } }),
}));

const { confirmMock } = vi.hoisted(() => ({ confirmMock: vi.fn() }));
vi.mock('@/ui/components/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));

const viewData = (
  overrides: Partial<ProjectionViewData['projection']> = {},
): ProjectionViewData => ({
  projection: {
    id: 'projection-1',
    name: 'Base case',
    engineVersion: 1,
    createdAt: new Date('2026-03-02T00:00:00.000Z'),
    createdBy: 'author@test.com',
    retirementNetWorth: 1_000_000,
    finalNetWorth: 2_000_000,
    minNetWorth: 900_000,
    minNetWorthYear: 2040,
    bankruptcyYear: 2045,
    isBankrupt: true,
    ...overrides,
  },
  config: {
    startYear: 2026,
    openingNetWorth: { amount: 100_000, source: 'manual' },
    assumptions: {
      birthYear: 1990,
      retirementAge: 60,
      lifeExpectancy: 85,
      inflationRate: 0.02,
      annualReturnRate: 0.05,
    },
    projectionRules: [
      {
        id: 'rule-1',
        name: 'Rent',
        ruleType: 'expense',
        method: 'fixedAmount',
        parameters: { amount: 20_000 },
        endCondition: { type: 'lifelong' },
        enabled: true,
      },
    ],
    lifeEvents: [
      {
        id: 'event-1',
        name: 'World trip',
        type: 'expense',
        enabled: true,
        phases: [{ startYear: 2040, endYear: 2041, amount: 50_000 }],
      },
    ],
  },
  source: {
    ruleSources: [
      {
        ruleId: 'rule-1',
        sourceType: 'ledgerCode',
        sourceId: 'expense:rent',
        baselineYear: 2025,
        baselineAmount: 240_000,
      },
    ],
  },
  annual: {
    years: [
      {
        year: 2026,
        age: 36,
        isRetired: false,
        opening: 100_000,
        return: 5_000,
        inflows: 0,
        outflows: 20_000,
        closing: 85_000,
      },
      {
        year: 2027,
        age: 37,
        isRetired: false,
        opening: 85_000,
        return: 4_250,
        inflows: 0,
        outflows: 20_000,
        closing: 69_250,
      },
    ],
  },
});

function openTab(name: string) {
  const tab = screen.getByRole('tab', { name });
  fireEvent.mouseDown(tab, { button: 0 });
  fireEvent.click(tab);
}

function renderView() {
  const router = createMemoryRouter(
    [
      { path: '/retirement/projections/:id', element: <ProjectionViewPage /> },
      { path: '/retirement', element: <div>projection list</div> },
      { path: '/retirement/new', element: <div>new projection</div> },
    ],
    { initialEntries: ['/retirement/projections/projection-1'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('ProjectionViewPage', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
    Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
    Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
    Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  });

  beforeEach(() => {
    vi.clearAllMocks();
    confirmMock.mockResolvedValue(false);
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(viewData());
    vi.mocked(renameProjectionNameUseCase.execute).mockResolvedValue({
      ok: true,
      name: 'Renamed projection',
    });
    vi.mocked(deleteProjectionUseCase.execute).mockResolvedValue(undefined);
    vi.mocked(saveProjectionAsPlanUseCase.execute).mockResolvedValue({ ok: true, id: 'plan-1' });
  });

  it('opens on SUMMARY with all six metrics and no editable fields', async () => {
    renderView();

    expect(await screen.findByTestId('projection-summary-tab')).toBeInTheDocument();
    expect(screen.getByTestId('metric-retirement-net-worth')).toHaveTextContent('NT$1,000,000');
    expect(screen.getByTestId('metric-final-net-worth')).toHaveTextContent('NT$2,000,000');
    expect(screen.getByTestId('metric-min-net-worth')).toHaveTextContent('NT$900,000');
    expect(screen.getByTestId('metric-min-net-worth-year')).toHaveTextContent('2040');
    expect(screen.getByTestId('metric-bankruptcy-year')).toHaveTextContent('2045');
    expect(screen.getByTestId('metric-is-bankrupt')).toHaveTextContent('Yes');
    expect(screen.getByLabelText('Net worth projection by year')).toBeInTheDocument();

    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByTestId('projection-projection-tab')).not.toBeInTheDocument();
  });

  it('unmounts hidden tabs', async () => {
    renderView();

    await screen.findByTestId('projection-summary-tab');
    openTab('PROJECTION');
    expect(await screen.findByTestId('projection-projection-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('projection-summary-tab')).not.toBeInTheDocument();

    openTab('SOURCE');
    expect(await screen.findByTestId('projection-source-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('projection-projection-tab')).not.toBeInTheDocument();
  });

  it('renders SOURCE as headed definition lists, not inputs', async () => {
    renderView();

    await screen.findByTestId('projection-summary-tab');
    openTab('SOURCE');
    await screen.findByTestId('projection-source-tab');

    expect(screen.getByText('BASELINE REFERENCES')).toBeInTheDocument();
    expect(screen.getByText('CONFIGURATION SNAPSHOT')).toBeInTheDocument();
    expect(screen.getByText('ASSUMPTIONS')).toBeInTheDocument();
    expect(screen.getByText(/expense:rent/)).toBeInTheDocument();
    expect(screen.getByText('2%')).toBeInTheDocument();
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });

  it('renames only through the title', async () => {
    renderView();

    await screen.findByText('Base case');
    fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Rename' }), {
      target: { value: 'Renamed projection' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));

    await waitFor(() =>
      expect(renameProjectionNameUseCase.execute).toHaveBeenCalledWith({
        householdId: 'household-1',
        projectionId: 'projection-1',
        name: 'Renamed projection',
        auth: expect.anything(),
      }),
    );
    expect(await screen.findByText('Renamed projection')).toBeInTheDocument();
  });

  it('prefills SAVE AS PLAN and blocks a blank name', async () => {
    renderView();

    fireEvent.click(await screen.findByRole('button', { name: 'SAVE AS PLAN' }));
    const input = await screen.findByLabelText('Plan name');
    expect(input).toHaveValue('Base case');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(saveProjectionAsPlanUseCase.execute).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'Reusable plan' } });
    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));

    await waitFor(() =>
      expect(saveProjectionAsPlanUseCase.execute).toHaveBeenCalledWith({
        householdId: 'household-1',
        projectionId: 'projection-1',
        name: 'Reusable plan',
        auth: expect.anything(),
      }),
    );
    await waitFor(() => expect(screen.queryByLabelText('Plan name')).not.toBeInTheDocument());
  });

  it('confirms deletion with the exact copy and returns to the list', async () => {
    confirmMock.mockResolvedValue(true);
    const router = renderView();

    await screen.findByText('Base case');
    fireEvent.click(screen.getByRole('button', { name: 'DELETE' }));

    await waitFor(() =>
      expect(confirmMock).toHaveBeenCalledWith({
        title: 'Delete this projection?',
        context: 'Base case · 2026–2075',
        consequence: 'This cannot be undone.',
        confirmLabel: 'DELETE',
      }),
    );
    await waitFor(() => expect(deleteProjectionUseCase.execute).toHaveBeenCalled());
    await waitFor(() => expect(router.state.location.pathname).toBe('/retirement'));
  });

  it('keeps the projection when deletion is cancelled', async () => {
    const router = renderView();

    await screen.findByText('Base case');
    fireEvent.click(screen.getByRole('button', { name: 'DELETE' }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(deleteProjectionUseCase.execute).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe('/retirement/projections/projection-1');
  });

  it('stays on the projection when deletion fails', async () => {
    confirmMock.mockResolvedValue(true);
    vi.mocked(deleteProjectionUseCase.execute).mockRejectedValue(new Error('boom'));
    const router = renderView();

    await screen.findByText('Base case');
    fireEvent.click(screen.getByRole('button', { name: 'DELETE' }));

    await waitFor(() => expect(deleteProjectionUseCase.execute).toHaveBeenCalled());
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/retirement/projections/projection-1'),
    );
  });

  it('warns about an old engine and links to recalculation', async () => {
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(viewData({ engineVersion: 0 }));
    renderView();

    const warning = await screen.findByTestId('stale-engine-warning');
    expect(warning).toHaveTextContent('This projection was calculated with an older engine.');
    expect(within(warning).getByRole('link', { name: 'RECALCULATE' })).toHaveAttribute(
      'href',
      '/retirement/new?from=projection-1',
    );
  });

  it('shows a warning and retries a failed load', async () => {
    vi.mocked(getProjectionViewUseCase.execute)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(viewData());

    renderView();

    expect(await screen.findByText('Could not load this projection.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RETRY' }));

    expect(await screen.findByTestId('projection-summary-tab')).toBeInTheDocument();
  });

  it('shows an empty not-found state with a way back', async () => {
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(null);
    const router = renderView();

    expect(await screen.findByText('This projection no longer exists.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'BACK TO PROJECTIONS' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/retirement'));
  });
});
