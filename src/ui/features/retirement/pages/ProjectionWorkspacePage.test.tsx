import { StrictMode } from 'react';

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { getProjectionOpeningUseCase } from '@/application/retirement/use_cases/getProjectionOpeningUseCase';
import { getProjectionViewUseCase } from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { persistProjectionUseCase } from '@/application/retirement/use_cases/persistProjectionUseCase';
import { calculateProjectionWorkflow } from '@/application/retirement/workflows/calculateProjection';
import { saveWorkspaceAsPlanWorkflow } from '@/application/retirement/workflows/saveWorkspaceAsPlan';
import { type ProjectionInput, type ProjectionResult } from '@/domains/retirement/projectionTypes';
import { type RetirementPlan } from '@/domains/retirement/types';

import ProjectionWorkspacePage from './ProjectionWorkspacePage';

vi.mock('@/application/retirement/use_cases/getProjectionOpeningUseCase', () => ({
  getProjectionOpeningUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/retirement/use_cases/getProjectionViewUseCase', () => ({
  getProjectionViewUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/retirement/workflows/calculateProjection', () => ({
  calculateProjectionWorkflow: { execute: vi.fn() },
}));

vi.mock('@/application/retirement/use_cases/persistProjectionUseCase', () => ({
  persistProjectionUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/retirement/workflows/saveProjectionAsPlan', () => ({
  saveProjectionAsPlanWorkflow: { execute: vi.fn() },
}));

vi.mock('@/application/retirement/workflows/saveWorkspaceAsPlan', () => ({
  saveWorkspaceAsPlanWorkflow: { execute: vi.fn() },
}));

vi.mock('@/application/retirement/use_cases/createRetirementPlanUseCase', () => ({
  createRetirementPlanUseCase: { execute: vi.fn() },
  ProjectionCommandErrorCode: {
    PROJECTION_VALIDATION_FAILED: 'PROJECTION_VALIDATION_FAILED',
    PROJECTION_RESOLVE_FAILED: 'PROJECTION_RESOLVE_FAILED',
    PROJECTION_TOO_LARGE: 'PROJECTION_TOO_LARGE',
  },
}));

vi.mock('@/application/debt/use_cases/listDebtAccountsUseCase', () => ({
  listDebtAccountsUseCase: { execute: vi.fn() },
}));

vi.mock('@/ui/features/ledger/hooks/useLedgerCodes', () => ({
  useLedgerCodes: () => ({
    codes: [
      { code: 'income:salary', label: '薪資', type: 'income', isCustom: false, isActive: true },
      { code: 'expense:living', label: '生活費', type: 'expense', isCustom: false, isActive: true },
    ],
    loading: false,
  }),
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

const { planLibraryMock } = vi.hoisted(() => ({
  planLibraryMock: {
    plans: [] as Array<{ id: string; name: string }>,
    loading: false,
    error: null as unknown,
    refresh: vi.fn(),
    getPlan: vi.fn(),
  },
}));

vi.mock('@/ui/features/retirement/hooks/usePlanLibrary', () => ({
  usePlanLibrary: () => planLibraryMock,
}));

const planFixture: RetirementPlan = {
  id: 'plan-1',
  name: 'Early retirement',
  assumptions: {
    birthYear: 1970,
    retirementAge: 55,
    lifeExpectancy: 90,
    inflationRate: 0.02,
    annualReturnRate: 0.05,
  },
  projectionRules: [],
  lifeEvents: [
    {
      id: 'event-1',
      name: 'World trip',
      type: 'expense',
      enabled: true,
      phases: [{ startYear: 2040, endYear: 2041, amount: 50_000 }],
    },
  ],
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-02-01'),
};

const projectionInput: ProjectionInput = {
  firstYear: 2026,
  lastYear: 2027,
  retirementYear: 2050,
  birthYear: 1990,
  openingNetWorth: 100_000,
  annualReturnRate: 0.05,
  years: [
    { year: 2026, inflows: [], outflows: [] },
    { year: 2027, inflows: [], outflows: [] },
  ],
};

const projectionResult: ProjectionResult = {
  years: [
    {
      year: 2026,
      age: 36,
      isRetired: false,
      opening: 100_000,
      return: 5_000,
      inflows: 0,
      outflows: 0,
      closing: 105_000,
    },
    {
      year: 2027,
      age: 37,
      isRetired: false,
      opening: 105_000,
      return: 5_250,
      inflows: 0,
      outflows: 0,
      closing: 110_250,
    },
  ],
  summary: {
    retirementNetWorth: 300_000,
    finalNetWorth: 110_250,
    minNetWorth: 100_000,
    minNetWorthYear: 2026,
    bankruptcyYear: null,
    isBankrupt: false,
  },
};

function successOutcome(warnings: unknown[] = []) {
  return {
    ok: true as const,
    calculation: {
      input: projectionInput,
      result: projectionResult,
      warnings: warnings as never,
      config: {
        startYear: 2026,
        openingNetWorth: { amount: 100_000, source: 'manual' as const },
        assumptions: {
          birthYear: 1990,
          retirementAge: 60,
          lifeExpectancy: 85,
          inflationRate: 0.02,
          annualReturnRate: 0.05,
        },
        projectionRules: [],
        lifeEvents: [],
      },
      source: { ruleSources: [] },
      startYear: 2026,
    },
  };
}

async function fillValidSetup() {
  await screen.findByText('No closed period yet.');
  fireEvent.click(screen.getByRole('button', { name: 'ENTER MANUALLY' }));
  fireEvent.change(screen.getByLabelText('Opening net worth'), { target: { value: '100000' } });
  fireEvent.change(screen.getByLabelText('Birth year'), { target: { value: '1990' } });
  fireEvent.change(screen.getByLabelText('Retirement age'), { target: { value: '60' } });
  fireEvent.change(screen.getByLabelText('Life expectancy'), { target: { value: '85' } });
  fireEvent.change(screen.getByLabelText('Inflation rate (%)'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Annual return rate (%)'), { target: { value: '5' } });
}

async function calculate() {
  fireEvent.click(screen.getByRole('button', { name: 'CALCULATE' }));
  await screen.findByTestId('projection-results');
}

function renderWorkspace(initialEntry = '/retirement/new') {
  const router = createMemoryRouter(
    [
      { path: '/retirement/new', element: <ProjectionWorkspacePage /> },
      { path: '/other', element: <div>other</div> },
    ],
    { initialEntries: [initialEntry] },
  );
  render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
  return router;
}

const preloadConfig = (overrides: Record<string, unknown> = {}) => ({
  projection: {
    id: 'projection-1',
    name: 'Source projection',
    engineVersion: 0,
    createdAt: new Date('2026-03-02T00:00:00.000Z'),
    createdBy: 'author@test.com',
    retirementNetWorth: null,
    finalNetWorth: 1,
    minNetWorth: 0,
    minNetWorthYear: null,
    bankruptcyYear: null,
    isBankrupt: false,
  },
  config: {
    startYear: 2028,
    openingNetWorth: { amount: 123_456, source: 'manual' as const },
    assumptions: {
      birthYear: 1990,
      retirementAge: 60,
      lifeExpectancy: 85,
      inflationRate: 0.02,
      annualReturnRate: 0.05,
    },
    projectionRules: [],
    lifeEvents: [],
    ...overrides,
  },
  source: { ruleSources: [] },
  annual: { years: [] },
});

async function addRule(ruleType: 'income' | 'expense' = 'income') {
  if (ruleType === 'expense') {
    fireEvent.click(screen.getAllByLabelText('Side')[0]);
    fireEvent.click(await screen.findByRole('option', { name: 'Expense' }));
    await waitFor(() => expect(screen.getAllByLabelText('Side')[0]).toHaveTextContent('Expense'));
  }
  fireEvent.click(await screen.findByRole('button', { name: 'ADD RULE' }));
}

function ruleRows() {
  return screen.getAllByTestId('rule-row');
}

async function addEvent() {
  fireEvent.click(screen.getByRole('button', { name: 'ADD EVENT' }));
  const rows = await screen.findAllByTestId('event-row');
  return rows[rows.length - 1];
}

function eventRows() {
  return screen.getAllByTestId('event-row');
}

function phaseRows(row: HTMLElement) {
  return within(row).getAllByTestId('phase-row');
}

async function addPhase(row: HTMLElement) {
  fireEvent.click(within(row).getByRole('button', { name: 'ADD PHASE' }));
  const phases = await within(row).findAllByTestId('phase-row');
  return phases[phases.length - 1];
}

function fillPhase(
  phase: HTMLElement,
  values: Partial<{ start: string; end: string; amount: string; growth: string; name: string }>,
) {
  if (values.start !== undefined) {
    fireEvent.change(within(phase).getByLabelText('Start year'), {
      target: { value: values.start },
    });
  }
  if (values.end !== undefined) {
    fireEvent.change(within(phase).getByLabelText('End year'), {
      target: { value: values.end },
    });
  }
  if (values.amount !== undefined) {
    fireEvent.change(within(phase).getByLabelText('Amount'), {
      target: { value: values.amount },
    });
  }
  if (values.growth !== undefined) {
    fireEvent.change(within(phase).getByLabelText('Growth rate (%)'), {
      target: { value: values.growth },
    });
  }
  if (values.name !== undefined) {
    fireEvent.change(within(phase).getByLabelText('Phase name'), {
      target: { value: values.name },
    });
  }
}

async function choose(label: string, option: string, scope: HTMLElement = document.body) {
  const trigger = within(scope).getByLabelText(label);
  fireEvent.click(trigger);
  const item = await screen.findByRole('option', { name: option });
  fireEvent.click(item);
}

describe('ProjectionWorkspacePage', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
    Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
    Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
    Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  });

  beforeEach(() => {
    vi.clearAllMocks();
    confirmMock.mockResolvedValue(false);
    planLibraryMock.plans = [];
    planLibraryMock.loading = false;
    planLibraryMock.error = null;
    planLibraryMock.getPlan.mockResolvedValue(null);
    vi.mocked(getProjectionOpeningUseCase.execute).mockResolvedValue({
      reason: 'NO_CLOSED_PERIOD',
    });
    vi.mocked(calculateProjectionWorkflow.execute).mockResolvedValue(successOutcome());
    vi.mocked(persistProjectionUseCase.execute).mockResolvedValue({
      ok: true,
      id: 'projection-1',
    });
    vi.mocked(saveWorkspaceAsPlanWorkflow.execute).mockResolvedValue({
      ok: true,
      id: 'plan-1',
    });
    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([
      {
        id: 'debt-1',
        name: 'Mortgage',
        isActive: true,
        monthlyPayment: 10_000,
      } as Awaited<ReturnType<typeof listDebtAccountsUseCase.execute>>[number],
    ]);
  });

  it('renders the fixed content order in one column', async () => {
    renderWorkspace();
    await screen.findByText('No closed period yet.');

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

  it('keeps the route when calculating and makes the inputs read-only', async () => {
    const router = renderWorkspace();
    await fillValidSetup();

    await calculate();

    expect(screen.getByText(/Preview is read-only/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SAVE' })).toBeEnabled();
    expect(screen.getByLabelText('Opening net worth')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Retirement age')).toHaveAttribute('readonly');
    expect(router.state.location.pathname).toBe('/retirement/new');

    fireEvent.click(screen.getByRole('button', { name: 'BACK TO SETUP' }));

    expect(screen.getByRole('button', { name: 'CALCULATE' })).toBeInTheDocument();
    expect(screen.queryByText(/Preview is read-only/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('projection-results')).not.toBeInTheDocument();
  });

  it('shows inline schema labels for invalid assumptions', async () => {
    renderWorkspace();

    fireEvent.change(await screen.findByLabelText('Retirement age'), {
      target: { value: '65.5' },
    });
    fireEvent.change(await screen.findByLabelText('Life expectancy'), {
      target: { value: '0' },
    });

    expect(await screen.findByText('必須是整數')).toBeInTheDocument();
    expect(screen.getByText('超出允許範圍')).toBeInTheDocument();
  });

  it('keeps birthYear editable on a fresh draft', async () => {
    renderWorkspace();
    expect(await screen.findByLabelText('Birth year')).not.toHaveAttribute('readonly');
  });

  it('resets parameters and source when the method changes', async () => {
    renderWorkspace();
    await addRule();
    const [row] = ruleRows();

    await choose('Method', 'Percentage of rule', row);
    expect(within(row).getByLabelText('Ratio (%)')).toBeInTheDocument();
    expect(within(row).queryByLabelText('Source type')).not.toBeInTheDocument();

    await choose('Method', 'Fixed amount', row);

    expect(within(row).queryByLabelText('Ratio (%)')).not.toBeInTheDocument();
    expect(within(row).getByLabelText('Amount')).toBeInTheDocument();
    expect(within(row).queryByLabelText('Source')).not.toBeInTheDocument();
    expect(within(row).getByText('No source needed for a fixed amount.')).toBeInTheDocument();
  });

  it('swaps end-condition inputs with the union variant', async () => {
    renderWorkspace();
    await addRule('expense');
    const [row] = ruleRows();
    expect(within(row).getByLabelText('Side')).toHaveTextContent('Expense');

    await choose('End condition', 'Specific age', row);
    expect(within(row).getByLabelText('Age')).toBeInTheDocument();

    await choose('End condition', 'Specific year', row);
    expect(within(row).getByLabelText('Year')).toBeInTheDocument();
    expect(within(row).queryByLabelText('Age')).not.toBeInTheDocument();

    await choose('End condition', 'Lifelong', row);
    expect(within(row).queryByLabelText('Age')).not.toBeInTheDocument();
    expect(within(row).queryByLabelText('Year')).not.toBeInTheDocument();

    await choose('Method', 'Debt amortization', row);
    expect(within(row).queryByLabelText('End condition')).not.toBeInTheDocument();
    expect(within(row).getByText(/follows debt/)).toBeInTheDocument();

    fireEvent.click(within(row).getByLabelText('Source'));
    expect(await screen.findByRole('option', { name: 'Mortgage' })).toBeInTheDocument();
  });

  it('shows baselinePolicy only for inflation/growthRate from a non-rule source and requires it', async () => {
    renderWorkspace();
    await addRule();
    const [row] = ruleRows();

    expect(within(row).getByLabelText('Baseline policy')).toBeInTheDocument();

    await choose('Source type', 'Another rule', row);
    expect(within(row).queryByLabelText('Baseline policy')).not.toBeInTheDocument();

    await choose('Source type', 'Ledger code', row);
    expect(within(row).getByLabelText('Baseline policy')).toBeInTheDocument();

    await choose('Source', '薪資', row);
    expect(await within(row).findByText('此規則需要基準政策')).toBeInTheDocument();
  });

  it('routes the source picker by source type', async () => {
    renderWorkspace();
    await addRule();
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Rule name'), { target: { value: 'Salary' } });
    });

    await addRule('expense');
    const rows = ruleRows();
    const second = rows[1];

    await choose('Method', 'Percentage of rule', second);
    const source = within(second).getByLabelText('Source');
    fireEvent.click(source);
    expect(await screen.findByRole('option', { name: 'Salary' })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('option', { name: 'Salary' })).not.toBeInTheDocument(),
    );

    await choose('Method', 'Fixed amount', second);
    expect(within(second).queryByLabelText('Source')).not.toBeInTheDocument();
  });

  it('toggles a rule enabled state', async () => {
    renderWorkspace();
    await addRule();
    const [row] = ruleRows();
    const toggle = within(row).getByRole('switch');

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('deletes a rule', async () => {
    renderWorkspace();
    await addRule();
    fireEvent.click(screen.getByRole('button', { name: 'Delete rule' }));
    expect(screen.queryAllByTestId('rule-row')).toHaveLength(0);
    expect(screen.getByText(/No projection rules yet/)).toBeInTheDocument();
  });

  it('confirms with the exact copy and applies the plan on APPLY', async () => {
    planLibraryMock.plans = [{ id: 'plan-1', name: 'Early retirement' }];
    planLibraryMock.getPlan.mockResolvedValue(planFixture);
    const router = renderWorkspace();

    fireEvent.click(await screen.findByRole('button', { name: 'APPLY PLAN' }));

    expect(await screen.findByText('Replace current setup?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Applying "Early retirement" replaces assumptions, rules and events in this workspace.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes in the workspace will be lost.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'APPLY' }));

    await waitFor(() => expect(screen.getByLabelText('Birth year')).toHaveValue(1970));
    expect(screen.getByLabelText('Birth year')).toHaveAttribute('readonly');
    expect(screen.getByTestId('applied-plan-name')).toHaveTextContent('Early retirement');

    await act(async () => {
      void router.navigate('/other');
    });
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
  });

  it('keeps the setup unchanged when the apply dialog is cancelled', async () => {
    planLibraryMock.plans = [{ id: 'plan-1', name: 'Early retirement' }];
    planLibraryMock.getPlan.mockResolvedValue(planFixture);
    renderWorkspace();

    fireEvent.click(await screen.findByRole('button', { name: 'APPLY PLAN' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.queryByTestId('applied-plan-name')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Birth year')).toHaveValue(null);
    expect(screen.getByLabelText('Birth year')).not.toHaveAttribute('readonly');
  });

  it('replaces every group and clears the preview when applying from preview', async () => {
    planLibraryMock.plans = [{ id: 'plan-1', name: 'Early retirement' }];
    planLibraryMock.getPlan.mockResolvedValue(planFixture);
    renderWorkspace();

    await fillValidSetup();
    await addRule();
    const [rule] = ruleRows();
    fireEvent.change(within(rule).getByLabelText('Rule name'), { target: { value: 'Rent' } });
    await choose('Method', 'Fixed amount', rule);
    fireEvent.change(within(rule).getByLabelText('Amount'), { target: { value: '100' } });
    await calculate();
    expect(screen.getByText(/Preview is read-only/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'APPLY PLAN' }));
    fireEvent.click(await screen.findByRole('button', { name: 'APPLY' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'CALCULATE' })).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Preview is read-only/)).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('rule-row')).toHaveLength(0);
  });

  it('reports a plan that could not be read', async () => {
    planLibraryMock.plans = [{ id: 'plan-1', name: 'Early retirement' }];
    planLibraryMock.getPlan.mockResolvedValue(null);
    renderWorkspace();

    fireEvent.click(await screen.findByRole('button', { name: 'APPLY PLAN' }));
    fireEvent.click(await screen.findByRole('button', { name: 'APPLY' }));

    expect(await screen.findByText('Could not load this plan.')).toBeInTheDocument();
  });

  it('adds, types, toggles and deletes a life event with no source picker', async () => {
    renderWorkspace();
    const row = await addEvent();

    expect(within(row).queryByLabelText('Source')).not.toBeInTheDocument();
    expect(within(row).queryByLabelText('Source type')).not.toBeInTheDocument();

    await choose('Type', 'Expense', row);
    expect(within(row).getByLabelText('Type')).toHaveTextContent('Expense');

    const toggle = within(row).getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(within(row).getByRole('button', { name: 'Delete event' }));
    expect(screen.queryAllByTestId('event-row')).toHaveLength(0);
    expect(screen.getByText(/No life events yet/)).toBeInTheDocument();
  });

  it('keeps events out of a rule percentage source list', async () => {
    renderWorkspace();
    const event = await addEvent();
    fireEvent.change(within(event).getByLabelText('Event name'), {
      target: { value: 'World trip' },
    });

    await addRule();
    await addRule();
    const [rule] = ruleRows();
    await choose('Method', 'Percentage of rule', rule);
    fireEvent.click(within(rule).getByLabelText('Source'));

    expect(await screen.findByRole('option', { name: '(unnamed rule)' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'World trip' })).not.toBeInTheDocument();
  });

  it('adds phases and sorts them by start year', async () => {
    renderWorkspace();
    const row = await addEvent();
    const first = phaseRows(row)[0];
    const second = await addPhase(row);
    const third = await addPhase(row);

    fillPhase(first, { start: '2040', end: '2041', amount: '1' });
    fillPhase(second, { start: '2030', end: '2031', amount: '1' });
    fillPhase(third, { start: '2035', end: '2036', amount: '1' });

    expect(
      phaseRows(row).map(
        (phase) => (within(phase).getByLabelText('Start year') as HTMLInputElement).value,
      ),
    ).toEqual(['2030', '2035', '2040']);
  });

  it('blocks overlapping phases and focuses the offending start year', async () => {
    renderWorkspace();
    const row = await addEvent();
    const first = phaseRows(row)[0];
    const second = await addPhase(row);

    fillPhase(first, { start: '2020', end: '2030', amount: '1' });
    fillPhase(second, { start: '2035', end: '2040', amount: '1' });
    fireEvent.change(within(second).getByLabelText('Start year'), {
      target: { value: '2025' },
    });

    expect(await within(row).findByText('階段不可重疊')).toBeInTheDocument();
    const offending = phaseRows(row)[1];
    await waitFor(() =>
      expect(document.activeElement).toBe(within(offending).getByLabelText('Start year')),
    );
  });

  it('blocks an end year before the start and focuses the end year', async () => {
    renderWorkspace();
    const row = await addEvent();
    const phase = phaseRows(row)[0];

    fillPhase(phase, { start: '2050', end: '2040', amount: '1' });

    expect(await within(row).findByText('結束年度不得早於開始年度')).toBeInTheDocument();
    await waitFor(() =>
      expect(document.activeElement).toBe(within(phase).getByLabelText('End year')),
    );
  });

  it('validates amount, growth rate and requires one phase', async () => {
    renderWorkspace();
    const row = await addEvent();
    const phase = phaseRows(row)[0];

    fillPhase(phase, { start: '2040', end: '2041', amount: '-1', growth: '25' });

    expect(await within(row).findByText('金額不得為負')).toBeInTheDocument();
    expect(within(row).getByText('成長率必須介於 -10% 到 20%')).toBeInTheDocument();

    fireEvent.click(within(phase).getByRole('button', { name: 'Delete phase' }));
    expect(await within(row).findByText('事件至少需要一個階段')).toBeInTheDocument();
  });

  it('accepts a blank optional phase name', async () => {
    renderWorkspace();
    const row = await addEvent();
    const phase = phaseRows(row)[0];

    fillPhase(phase, { start: '2040', end: '2041', amount: '500' });

    expect(within(row).queryByText('階段名稱不可留白')).not.toBeInTheDocument();
  });

  it('marks the workspace dirty on an event edit', async () => {
    const router = renderWorkspace();
    await addEvent();

    await act(async () => {
      void router.navigate('/other');
    });

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(router.state.location.pathname).toBe('/retirement/new');
  });

  it('replaces the events when a plan is applied', async () => {
    planLibraryMock.plans = [{ id: 'plan-1', name: 'Early retirement' }];
    planLibraryMock.getPlan.mockResolvedValue(planFixture);
    renderWorkspace();

    await addEvent();
    fireEvent.click(await screen.findByRole('button', { name: 'APPLY PLAN' }));
    fireEvent.click(await screen.findByRole('button', { name: 'APPLY' }));

    await waitFor(() => expect(eventRows()).toHaveLength(1));
    const [row] = eventRows();
    expect(within(row).getByLabelText('Event name')).toHaveValue('World trip');
    expect(within(row).getByLabelText('Type')).toHaveTextContent('Expense');
    expect(within(row).getByLabelText('Start year')).toHaveValue(2040);
  });

  it('blocks calculation on invalid setup and reveals every error inline', async () => {
    renderWorkspace();
    await screen.findByText('No closed period yet.');

    fireEvent.click(screen.getByRole('button', { name: 'CALCULATE' }));

    expect(screen.getAllByText('必須是整數')).toHaveLength(3);
    expect(screen.getAllByText('請輸入數字')).toHaveLength(2);
    expect(screen.queryByTestId('projection-results')).not.toBeInTheDocument();
    expect(screen.queryByText(/Preview is read-only/)).not.toBeInTheDocument();
    expect(calculateProjectionWorkflow.execute).not.toHaveBeenCalled();
  });

  it('requires an integer manual opening balance', async () => {
    renderWorkspace();
    await screen.findByText('No closed period yet.');
    fireEvent.click(screen.getByRole('button', { name: 'ENTER MANUALLY' }));
    fireEvent.change(screen.getByLabelText('Birth year'), { target: { value: '1990' } });
    fireEvent.change(screen.getByLabelText('Retirement age'), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText('Life expectancy'), { target: { value: '85' } });
    fireEvent.change(screen.getByLabelText('Inflation rate (%)'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Annual return rate (%)'), { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: 'CALCULATE' }));

    expect(screen.getByTestId('opening-validation-error')).toHaveTextContent(
      'Enter a whole-number opening net worth.',
    );
    expect(calculateProjectionWorkflow.execute).not.toHaveBeenCalled();
  });

  it('shows warnings above the results without blocking SAVE', async () => {
    vi.mocked(calculateProjectionWorkflow.execute).mockResolvedValue(
      successOutcome([
        {
          code: 'BASELINE_BEHIND',
          params: { ruleId: 'rule-1', baselineYear: 2024 },
          severity: 'warning',
        },
      ]),
    );
    renderWorkspace();
    await fillValidSetup();

    await calculate();

    const warning = screen.getByTestId('projection-warnings');
    expect(warning).toHaveTextContent('基準年度 2024 早於投影起點。');
    expect(screen.getByTestId('metric-retirement-net-worth')).toHaveTextContent('NT$300,000');
    expect(screen.getByTestId('metric-is-bankrupt')).toHaveTextContent('No');
    expect(screen.getByRole('button', { name: 'SAVE' })).toBeEnabled();
  });

  it('lists resolver errors and stays in setup', async () => {
    vi.mocked(calculateProjectionWorkflow.execute).mockResolvedValue({
      ok: false,
      code: 'PROJECTION_RESOLVE_FAILED',
      errors: [
        {
          code: 'MISSING_LEDGER_CODE',
          params: { ledgerCodeId: 'expense:rent' },
          severity: 'error',
        },
      ],
      warnings: [],
    });
    renderWorkspace();
    await fillValidSetup();

    fireEvent.click(screen.getByRole('button', { name: 'CALCULATE' }));

    expect(await screen.findByText('找不到科目：expense:rent')).toBeInTheDocument();
    expect(screen.queryByTestId('projection-results')).not.toBeInTheDocument();
    expect(screen.queryByText(/Preview is read-only/)).not.toBeInTheDocument();
  });

  it('preloads a manual projection setup, marks it dirty and strips the query', async () => {
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(preloadConfig() as never);
    const router = renderWorkspace('/retirement/new?from=projection-1');

    await waitFor(() => expect(screen.getByLabelText('Birth year')).toHaveValue(1990));
    expect(screen.getByLabelText('Opening net worth')).toHaveValue(123456);
    expect(screen.getByLabelText('Birth year')).toHaveAttribute('readonly');
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(getProjectionOpeningUseCase.execute).not.toHaveBeenCalled();

    await act(async () => {
      void router.navigate('/other');
    });
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
  });

  it('re-resolves a derived opening while keeping the rest of the preload', async () => {
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(
      preloadConfig({
        openingNetWorth: { amount: 1, source: 'derived', anchorYearMonth: '2026-01' },
      }) as never,
    );
    vi.mocked(getProjectionOpeningUseCase.execute).mockResolvedValue({
      openingNetWorth: 380_000,
      anchorYearMonth: '2026-08',
      assets: 500_000,
      liabilities: 120_000,
    });
    const router = renderWorkspace('/retirement/new?from=projection-1');

    await waitFor(() => expect(screen.getByLabelText('Opening net worth')).toHaveValue(380000));
    expect(screen.getByLabelText('Birth year')).toHaveValue(1990);
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('leaves the opening blank and warns when a derived opening no longer resolves', async () => {
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(
      preloadConfig({
        openingNetWorth: { amount: 1, source: 'derived', anchorYearMonth: '2026-01' },
      }) as never,
    );
    vi.mocked(getProjectionOpeningUseCase.execute).mockResolvedValue({
      reason: 'NO_CLOSED_PERIOD',
    });
    const router = renderWorkspace('/retirement/new?from=projection-1');

    expect(await screen.findByTestId('preload-warning')).toBeInTheDocument();
    expect(screen.getByLabelText('Opening net worth')).toHaveValue(null);
    expect(screen.getByLabelText('Birth year')).toHaveValue(1990);
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('falls back to a blank, dirty setup when the source projection is gone', async () => {
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(null);
    const router = renderWorkspace('/retirement/new?from=missing');

    expect(await screen.findByTestId('preload-warning')).toHaveTextContent(
      'Could not resolve the opening balance. Starting from a blank setup with the opening left empty.',
    );
    expect(screen.getByLabelText('Opening net worth')).toHaveValue(null);
    await waitFor(() => expect(router.state.location.search).toBe(''));

    await act(async () => {
      void router.navigate('/other');
    });
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
  });

  it('shows no results area before calculation', async () => {
    renderWorkspace();
    await screen.findByText('No closed period yet.');
    expect(screen.queryByTestId('projection-results')).not.toBeInTheDocument();
  });

  it('prefills the save dialog and requires a non-blank name', async () => {
    renderWorkspace();
    await fillValidSetup();
    await calculate();

    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));

    const input = await screen.findByLabelText('Projection name');
    expect((input as HTMLInputElement).value).toMatch(/^Projection \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(persistProjectionUseCase.execute).not.toHaveBeenCalled();
  });

  it('stays open and inert while saving', async () => {
    renderWorkspace();
    await fillValidSetup();
    await calculate();
    vi.mocked(persistProjectionUseCase.execute).mockImplementationOnce(
      () => new Promise(() => undefined),
    );

    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));
    fireEvent.click(await screen.findByRole('button', { name: 'SAVE' }));

    expect(await screen.findByRole('button', { name: 'SAVING...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.getByLabelText('Projection name')).toBeInTheDocument());
  });

  it('shows an error and RETRY when saving fails, and Cancel returns to preview', async () => {
    renderWorkspace();
    await fillValidSetup();
    await calculate();
    vi.mocked(persistProjectionUseCase.execute)
      .mockRejectedValueOnce(new Error('Could not save the projection. Nothing was written.'))
      .mockResolvedValueOnce({
        ok: true,
        id: 'projection-1',
      });

    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));
    fireEvent.click(await screen.findByRole('button', { name: 'SAVE' }));

    expect(
      await screen.findByText('Could not save the projection. Nothing was written.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RETRY' }));

    expect(await screen.findByRole('link', { name: 'View projection' })).toHaveAttribute(
      'href',
      '/retirement/projections/projection-1',
    );

    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'SAVE' })).toBeInTheDocument();
  });

  it('closes on success, stays in preview, links the projection and prefills the last name', async () => {
    vi.mocked(persistProjectionUseCase.execute).mockResolvedValue({
      ok: true,
      id: 'projection-9',
    });
    renderWorkspace();
    await fillValidSetup();
    await calculate();

    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));
    const input = await screen.findByLabelText('Projection name');
    fireEvent.change(input, { target: { value: 'First projection' } });
    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));

    const link = await screen.findByRole('link', { name: 'View projection' });
    expect(link).toHaveAttribute('href', '/retirement/projections/projection-9');
    expect(screen.getByText('Projection saved.')).toBeInTheDocument();
    expect(screen.getByText(/Preview is read-only/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Projection name')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));
    expect(await screen.findByLabelText('Projection name')).toHaveValue('First projection');
  });
});
