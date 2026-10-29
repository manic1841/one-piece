import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteProjectionUseCase } from '@/application/retirement/use_cases/deleteProjectionUseCase';
import {
  type ProjectionViewData,
  getProjectionViewUseCase,
} from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { renameProjectionNameUseCase } from '@/application/retirement/use_cases/renameProjectionNameUseCase';
import { saveProjectionAsPlanWorkflow } from '@/application/retirement/workflows/saveProjectionAsPlan';

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
vi.mock('@/application/retirement/workflows/saveProjectionAsPlan', () => ({
  saveProjectionAsPlanWorkflow: { execute: vi.fn() },
}));

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({ userProfile: { uid: 'user-1', householdId: 'household-1' } }),
}));

const { confirmMock } = vi.hoisted(() => ({ confirmMock: vi.fn() }));
vi.mock('@/ui/components/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));

const START_YEAR = 2026;
const RETIREMENT_YEAR = 2030;
const MIN_YEAR = 2032;
const BANKRUPT_YEAR = 2033;

const yearRow = (year: number, closing: number) => ({
  year,
  age: year - 1990,
  isRetired: year >= RETIREMENT_YEAR,
  opening: closing + 10_000,
  return: 1_000,
  inflows: 50_000,
  outflows: 20_000,
  closing,
});

const YEARS = [
  yearRow(2026, 900_000),
  yearRow(2027, 800_000),
  yearRow(2028, 700_000),
  yearRow(2029, 600_000),
  yearRow(2030, 500_000),
  yearRow(2031, 400_000),
  yearRow(2032, 300_000),
  yearRow(2033, -10_000),
  yearRow(2034, -90_000),
  yearRow(2035, -200_000),
];

const lifeEvent = (id: string, name: string, startYear: number, endYear = startYear) => ({
  id,
  name,
  type: 'expense' as const,
  enabled: true,
  phases: [{ startYear, endYear, amount: 50_000 }],
});

const viewData = (
  overrides: Partial<ProjectionViewData['projection']> = {},
): ProjectionViewData => ({
  projection: {
    id: 'projection-1',
    name: 'Base case',
    engineVersion: 1,
    createdAt: new Date('2026-03-02T00:00:00.000Z'),
    createdBy: 'author@test.com',
    retirementNetWorth: 500_000,
    finalNetWorth: -200_000,
    minNetWorth: -200_000,
    minNetWorthYear: MIN_YEAR,
    bankruptcyYear: BANKRUPT_YEAR,
    isBankrupt: true,
    ...overrides,
  },
  config: {
    startYear: START_YEAR,
    openingNetWorth: { amount: 100_000, source: 'manual' },
    assumptions: {
      birthYear: 1990,
      retirementAge: 40,
      lifeExpectancy: 45,
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
      lifeEvent('event-1', 'World trip', 2030),
      lifeEvent('event-2', 'Car', 2031),
      lifeEvent('event-3', 'Boat', 2032),
      lifeEvent('event-4', 'Education', 2032, 2033),
      lifeEvent('event-5', 'Move', 2033),
      lifeEvent('event-6', 'Wedding', 2034),
      lifeEvent('event-7', 'Trip', 2035),
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
  annual: { years: YEARS },
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

/** Give the chart scrubber a measurable width so pointer maps to a column. */
function chartSlider(label: string) {
  const slider = screen.getByRole('slider', { name: label });
  slider.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 1000, height: 320, right: 1000, bottom: 320 }) as DOMRect;
  return slider;
}

const clickColumn = (slider: HTMLElement, index: number, columns: number) => {
  fireEvent.click(slider, { clientX: (1000 / columns) * (index + 0.5) });
};

function isBefore(first: HTMLElement, second: HTMLElement) {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
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
    vi.mocked(saveProjectionAsPlanWorkflow.execute).mockResolvedValue({ ok: true, id: 'plan-1' });
  });

  it('opens on OVERVIEW and names the three read-only tabs', async () => {
    renderView();

    expect(await screen.findByTestId('projection-overview-tab')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'OVERVIEW' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'PROJECTION' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'SETTINGS' })).toBeInTheDocument();
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });

  it('scrolls the tab list on a wrapper so the list keeps its full-width rule', async () => {
    renderView();

    const tabList = await screen.findByRole('tablist');
    expect(tabList).not.toHaveClass('overflow-x-auto');
    expect(tabList.parentElement).toHaveClass('overflow-x-auto', 'pb-px');
  });

  it('reads the verdict, the number behind it, then the trend and supporting metrics', async () => {
    renderView();

    const verdict = await screen.findByTestId('overview-verdict');
    expect(verdict).toHaveTextContent('淨資產於 2033 轉負，投影期末為 -NT$200,000。');

    const hero = screen.getByTestId('overview-retirement-net-worth');
    expect(hero).toHaveTextContent('NT$500,000');
    expect(hero).toHaveTextContent('退休當下（年初）');
    expect(hero).toHaveTextContent('Age 40 · 2030');

    const chart = chartSlider('Net worth projection by year');
    const minCard = screen.getByText('Lowest net worth');

    expect(isBefore(verdict, hero)).toBe(true);
    expect(isBefore(hero, chart)).toBe(true);
    expect(isBefore(chart, minCard)).toBe(true);
  });

  it('states a sustained verdict when net worth never turns negative', async () => {
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(
      viewData({ bankruptcyYear: null, isBankrupt: false, minNetWorth: 300_000 }),
    );
    renderView();

    const verdict = await screen.findByTestId('overview-verdict');
    expect(verdict).toHaveTextContent('可支應至 2035');
    expect(verdict).toHaveTextContent('NT$300,000');
    expect(screen.queryByTestId('negative-net-worth-warning')).not.toBeInTheDocument();
  });

  it('degrades to the primary metric and an explanation without annual results', async () => {
    const data = viewData({ retirementNetWorth: null });
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue({
      ...data,
      annual: { years: [] },
    });
    renderView();

    const hero = await screen.findByTestId('overview-retirement-net-worth');
    expect(hero).toHaveTextContent('—');
    expect(screen.getByTestId('overview-empty')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('overview-verdict')).not.toBeInTheDocument();

    openTab('PROJECTION');
    expect(await screen.findByTestId('projection-projection-tab')).toHaveTextContent(
      '選取一個年份以查看年度明細。',
    );
    expect(screen.queryByTestId('annual-year-panel')).not.toBeInTheDocument();
  });

  it('selects the clicked overview year and switches to PROJECTION', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    const slider = chartSlider('Net worth projection by year');
    clickColumn(slider, 3, YEARS.length);

    expect(await screen.findByTestId('projection-projection-tab')).toBeInTheDocument();
    expect(screen.getByTestId('annual-year-panel')).toHaveTextContent('2029 · Age 39');
  });

  it('keeps the selected year across tab switches', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('PROJECTION');
    await screen.findByTestId('projection-projection-tab');

    const slider = chartSlider('Net worth projection by year');
    clickColumn(slider, 1, YEARS.length);
    expect(screen.getByTestId('annual-year-panel')).toHaveTextContent('2027');

    openTab('SETTINGS');
    await screen.findByTestId('projection-snapshot-tab');
    openTab('PROJECTION');

    expect(await screen.findByTestId('annual-year-panel')).toHaveTextContent('2027');
  });

  it('defaults the trajectory to net worth and swaps to the cash-flow view', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('PROJECTION');
    await screen.findByTestId('projection-projection-tab');

    expect(
      screen.getByRole('slider', { name: 'Net worth projection by year' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('slider', { name: 'Net worth change projection by year' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '淨資產' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '收支結構' }));

    expect(
      screen.getByRole('slider', { name: 'Net worth change projection by year' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('slider', { name: 'Net worth projection by year' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '收支結構' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('keeps the selected year when the trajectory view changes', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('PROJECTION');
    await screen.findByTestId('projection-projection-tab');

    fireEvent.click(await screen.findByRole('button', { name: '退休 · 2030' }));
    fireEvent.click(screen.getByRole('button', { name: '收支結構' }));

    expect(screen.getByTestId('annual-year-panel')).toHaveTextContent('2030');
    fireEvent.click(screen.getByRole('button', { name: '淨資產' }));
    expect(screen.getByTestId('annual-year-panel')).toHaveTextContent('2030');
  });

  it('hints when no year is selected and offers the full table anyway', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('PROJECTION');

    expect(await screen.findByText('選取一個年份以查看年度明細。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /全部年份/ })).toBeInTheDocument();
    expect(screen.queryByTestId('annual-year-panel')).not.toBeInTheDocument();
  });

  it('renders only the key years that exist', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('PROJECTION');
    await screen.findByTestId('projection-projection-tab');

    expect(screen.getByRole('button', { name: '退休 · 2030' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '最低 · 2032' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '規劃期末 · 2035' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '淨資產轉負 · 2033' })).toBeInTheDocument();
  });

  it('hides the minimum and negative key years when they are missing', async () => {
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(
      viewData({ bankruptcyYear: null, isBankrupt: false, minNetWorthYear: null }),
    );
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('PROJECTION');
    await screen.findByTestId('projection-projection-tab');

    expect(screen.queryByRole('button', { name: /最低/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /淨資產轉負/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '退休 · 2030' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /規劃期末/ })).toBeInTheDocument();
  });

  it('opens the panel from a key year and swaps Summary with Cash flow', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('PROJECTION');
    fireEvent.click(await screen.findByRole('button', { name: '最低 · 2032' }));

    const panel = screen.getByTestId('annual-year-panel');
    expect(panel).toHaveTextContent('2032 · Age 42');
    expect(within(panel).getByText('淨資產變動')).toBeInTheDocument();
    expect(within(panel).queryByText('收入')).not.toBeInTheDocument();

    fireEvent.click(within(panel).getByRole('button', { name: 'Cash flow' }));
    expect(within(panel).getByText('收入')).toBeInTheDocument();
    expect(within(panel).getByText('投資收益')).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole('button', { name: 'Summary' }));
    expect(within(panel).getByText('退休狀態')).toBeInTheDocument();
  });

  it('owns the view divider on a full-width wrapper, not on the shrink-wrapped strip', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('PROJECTION');
    fireEvent.click(await screen.findByRole('button', { name: '最低 · 2032' }));

    const viewStrip = within(screen.getByTestId('annual-year-panel')).getByRole('group', {
      name: '年度明細檢視',
    });
    expect(viewStrip).not.toHaveClass('border-b');
    expect(viewStrip.parentElement).toHaveClass('flex', 'border-b');
  });

  it('selects a table row and opens its detail in place', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('PROJECTION');
    fireEvent.click(await screen.findByRole('button', { name: /全部年份/ }));

    const row = screen.getByTestId('yearly-row-2028');
    fireEvent.click(row);

    expect(screen.getByTestId('annual-year-panel')).toHaveTextContent('2028');
    expect(screen.getByTestId('yearly-detail-2028')).toBeInTheDocument();
    expect(row).toHaveAttribute('aria-expanded', 'true');

    const expand = within(row).getByRole('button', { name: '展開 2028 年明細' });
    fireEvent.click(expand);

    expect(screen.queryByTestId('yearly-detail-2028')).not.toBeInTheDocument();
    expect(screen.getByTestId('annual-year-panel')).toHaveTextContent('2028');
  });

  it('selects the year from the expand button too, matching the row', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('PROJECTION');
    fireEvent.click(await screen.findByRole('button', { name: /全部年份/ }));

    const expand = within(screen.getByTestId('yearly-row-2028')).getByRole('button', {
      name: '展開 2028 年明細',
    });
    fireEvent.click(expand);

    expect(screen.getByTestId('yearly-row-2028')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('annual-year-panel')).toHaveTextContent('2028');
    expect(screen.getByTestId('yearly-detail-2028')).toBeInTheDocument();
  });

  it('selects and expands a mobile row in place', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('PROJECTION');
    fireEvent.click(await screen.findByRole('button', { name: /全部年份/ }));

    const row = screen.getByTestId('yearly-row-mobile-2028');
    fireEvent.click(row);
    expect(screen.getByTestId('annual-year-panel')).toHaveTextContent('2028');

    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(within(row).getByText('投資收益')).toBeInTheDocument();
  });

  it('marks the selected mobile row with aria-current', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('PROJECTION');
    fireEvent.click(await screen.findByRole('button', { name: /全部年份/ }));
    fireEvent.click(screen.getByTestId('yearly-row-mobile-2027'));

    expect(screen.getByTestId('yearly-row-mobile-2027')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('yearly-row-mobile-2028')).not.toHaveAttribute('aria-current');
  });

  it('marks the selected row with aria-current', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('PROJECTION');
    fireEvent.click(await screen.findByRole('button', { name: /全部年份/ }));
    fireEvent.click(screen.getByTestId('yearly-row-2027'));

    expect(screen.getByTestId('yearly-row-2027')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('yearly-row-2028')).not.toHaveAttribute('aria-current');
  });

  it('selects through the keyboard scrubber', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('PROJECTION');
    const slider = chartSlider('Net worth projection by year');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'Enter' });

    expect(screen.getByTestId('annual-year-panel')).toHaveTextContent('2026');
  });

  it('reads opening facts, assumptions, rules and events in that order', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('SETTINGS');
    const snapshot = await screen.findByTestId('projection-snapshot-tab');

    const opening = within(snapshot).getByText('期初金額');
    const assumptions = within(snapshot).getByText('假設');
    const rules = within(snapshot).getByText('規則');
    const events = within(snapshot).getByText('人生事件');

    expect(isBefore(opening, assumptions)).toBe(true);
    expect(isBefore(assumptions, rules)).toBe(true);
    expect(isBefore(rules, events)).toBe(true);

    expect(within(snapshot).getByText('Manual')).toBeInTheDocument();
    expect(within(snapshot).getAllByRole('table')).toHaveLength(1);
  });

  it('shows assumptions, rules and their sources together without collapsing', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('SETTINGS');

    expect(await screen.findByText('2%')).toBeInTheDocument();
    // Mobile list and desktop table both render the same rule and its source.
    expect(screen.getAllByText('Rent').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/expense:rent/).length).toBeGreaterThan(0);
  });

  it('renders every event without an expand-all control', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('SETTINGS');

    expect(await screen.findByTestId('life-event-timeline')).toBeInTheDocument();
    expect(screen.getByText('World trip')).toBeInTheDocument();
    expect(screen.getByText('Wedding')).toBeInTheDocument();
    expect(screen.getByText('Trip')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '展開全部事件' })).not.toBeInTheDocument();
  });

  it('expands an event for its phase details', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('SETTINGS');

    const eventRow = await screen.findByRole('button', { name: /^World trip / });
    fireEvent.click(eventRow);

    expect(screen.getByTestId('event-details-event-1')).toHaveTextContent('NT$50,000');
    expect(eventRow).toHaveAttribute('aria-expanded', 'true');
  });

  it('places every event against the retirement anchor', async () => {
    renderView();

    await screen.findByTestId('projection-overview-tab');
    openTab('SETTINGS');

    expect(
      await screen.findByRole('button', { name: /^World trip 2030 退休年/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Trip 2035 退休後/ })).toBeInTheDocument();
    expect(screen.getByText('退休')).toBeInTheDocument();
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

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(saveProjectionAsPlanWorkflow.execute).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'Reusable plan' } });
    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));

    await waitFor(() =>
      expect(saveProjectionAsPlanWorkflow.execute).toHaveBeenCalledWith({
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
        context: 'Base case · 2026–2035',
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

    expect(await screen.findByTestId('projection-overview-tab')).toBeInTheDocument();
  });

  it('shows an empty not-found state with a way back', async () => {
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(null);
    const router = renderView();

    expect(await screen.findByText('This projection no longer exists.')).toBeInTheDocument();
    // The header back and the empty-state CTA share a name; this asserts the CTA.
    const [, emptyStateBack] = screen.getAllByRole('button', { name: 'BACK TO PROJECTIONS' });
    fireEvent.click(emptyStateBack);

    await waitFor(() => expect(router.state.location.pathname).toBe('/retirement'));
  });
});
