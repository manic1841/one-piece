import { StrictMode } from 'react';

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { getProjectionOpeningUseCase } from '@/application/retirement/use_cases/getProjectionOpeningUseCase';
import { getProjectionViewUseCase } from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { getRetirementPlanUseCase } from '@/application/retirement/use_cases/getRetirementPlanUseCase';
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

const { ledgerCodesMock } = vi.hoisted(() => ({
  ledgerCodesMock: {
    codes: [
      { code: 'income:salary', label: '薪資', type: 'income', isCustom: false, isActive: true },
      { code: 'expense:living', label: '生活費', type: 'expense', isCustom: false, isActive: true },
    ] as Array<{
      code: string;
      label: string;
      type: string;
      isCustom: boolean;
      isActive: boolean;
    }>,
  },
}));

vi.mock('@/ui/features/ledger/hooks/useLedgerCodes', () => ({
  useLedgerCodes: () => ({ codes: ledgerCodesMock.codes, loading: false }),
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

vi.mock('@/application/retirement/use_cases/getRetirementPlanUseCase', () => ({
  getRetirementPlanUseCase: { execute: vi.fn() },
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

async function fillAssumptions() {
  await screen.findByText('No closed period yet.');
  fireEvent.change(screen.getByLabelText('Opening net worth'), { target: { value: '100000' } });
  fireEvent.change(screen.getByLabelText('Birth year'), { target: { value: '1990' } });
  fireEvent.change(screen.getByLabelText('Retirement age'), { target: { value: '60' } });
  fireEvent.change(screen.getByLabelText('Life expectancy'), { target: { value: '85' } });
  fireEvent.change(screen.getByLabelText('Inflation rate (%)'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Annual return rate (%)'), { target: { value: '5' } });
}

async function fillValidSetup() {
  await fillAssumptions();
  await addRule();
  fireEvent.change(within(ruleInspector()).getByLabelText(/Rule name/), {
    target: { value: 'Salary' },
  });
  await choose('Method', 'Fixed amount');
  fireEvent.change(within(ruleInspector()).getByLabelText('Amount'), {
    target: { value: '1000' },
  });
  fireEvent.click(screen.getByTestId('rule-confirm'));
  await waitFor(() => expect(screen.queryByTestId('rule-inspector')).not.toBeInTheDocument());
}

async function calculate() {
  const button = screen.getByRole('button', { name: 'CALCULATE' });
  expect(
    button,
    `${screen.getByTestId('workspace-action-bar').textContent ?? ''} | ${screen.queryByTestId('income-rule-error-summary')?.textContent ?? 'none'}`,
  ).toBeEnabled();
  fireEvent.click(button);
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

/** ADD opens the dialog on a fresh rule; the rule is already live in the form. */
async function addRule(ruleType: 'income' | 'expense' = 'income') {
  fireEvent.click(await screen.findByRole('button', { name: 'ADD RULE' }));
  if (ruleType === 'expense') await choose('Side', 'Expense');
}

/** Names the rule and confirms, which closes the dialog and leaves the row. */
async function confirmRule(name = 'Rule') {
  fireEvent.change(within(ruleInspector()).getByLabelText(/Rule name/), {
    target: { value: name },
  });
  fireEvent.click(screen.getByTestId('rule-confirm'));
  await waitFor(() => expect(screen.queryByTestId('rule-inspector')).not.toBeInTheDocument());
}

/** Opening a row loads it into the dialog; the row itself has no fields. */
function openAdvanced(row: HTMLElement) {
  fireEvent.click(within(row).getByRole('button'));
}

function ruleInspector() {
  return screen.getByTestId('rule-inspector');
}

function ruleRows() {
  return screen.getAllByTestId('rule-row');
}

function listbox() {
  return screen.getByRole('listbox');
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
    ledgerCodesMock.codes = [
      { code: 'income:salary', label: '薪資', type: 'income', isCustom: false, isActive: true },
      { code: 'expense:living', label: '生活費', type: 'expense', isCustom: false, isActive: true },
    ];
    confirmMock.mockResolvedValue(false);
    vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(null);
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

  it('renders the fixed numbered section order', async () => {
    renderWorkspace();
    await screen.findByText('No closed period yet.');

    expect(screen.getAllByText(/^\d{2} \/ /).map((heading) => heading.textContent)).toEqual([
      '01 / BASELINE',
      '02 / ASSUMPTIONS',
      '03 / RULES',
      '04 / LIFE EVENTS',
    ]);
  });

  it('keeps both rule sides in one band under a single ADD', async () => {
    renderWorkspace();
    await screen.findByText('No closed period yet.');

    // One ADD: the side is a field on the rule, not a second button.
    expect(screen.getByRole('button', { name: 'ADD RULE' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ADD INCOME RULE' })).not.toBeInTheDocument();

    await addRule('expense');
    expect(screen.getByTestId('expense-rule-status')).toHaveTextContent('1');
    expect(screen.getByTestId('income-rule-status')).toHaveTextContent('0');
  });

  it('keeps the route when calculating and makes the inputs read-only', async () => {
    const router = renderWorkspace();
    await fillValidSetup();

    await calculate();

    expect(screen.getByText(/Preview is read-only/)).toBeInTheDocument();
    expect(screen.getByTestId('workspace-summary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SAVE' })).toBeEnabled();
    expect(screen.queryByLabelText('Opening net worth')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workspace-rail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workspace-pinned-bar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'SAVE AS PLAN' })).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/retirement/new');

    fireEvent.click(screen.getByRole('button', { name: 'BACK TO SETUP' }));

    expect(screen.getByRole('button', { name: 'CALCULATE' })).toBeInTheDocument();
    expect(screen.getByTestId('workspace-rail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SAVE AS PLAN' })).toBeInTheDocument();
    expect(screen.queryByText(/Preview is read-only/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('projection-results')).not.toBeInTheDocument();
  });

  it('expands the baseline summary with the amount actually used', async () => {
    renderWorkspace();
    await fillValidSetup();
    await calculate();

    const summary = screen.getByTestId('workspace-summary');
    const baseline = within(summary).getByTestId('summary-01');
    fireEvent.click(within(baseline).getByRole('button', { name: 'Show summary' }));

    expect(baseline).toHaveTextContent('NT$100,000');
    expect(baseline).toHaveTextContent('Manual value');
  });

  it('seeds the opening from the snapshot and offers USE SNAPSHOT only after an edit', async () => {
    vi.mocked(getProjectionOpeningUseCase.execute).mockResolvedValue({
      openingNetWorth: 380_000,
      anchorYearMonth: '2026-08',
      assets: 500_000,
      liabilities: 120_000,
    });
    renderWorkspace();

    const input = await screen.findByLabelText('Opening net worth');
    await waitFor(() => expect(input).toHaveValue(380000));
    expect(screen.getByTestId('opening-net-worth-note')).toHaveTextContent(
      'Derived from the latest closed period. As of 2026-08',
    );
    expect(screen.queryByRole('button', { name: 'USE SNAPSHOT' })).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: '250000' } });
    expect(input).toHaveValue(250000);
    expect(screen.queryByTestId('opening-net-worth-note')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'USE SNAPSHOT' }));
    expect(input).toHaveValue(380000);
    expect(screen.getByTestId('opening-net-worth-note')).toHaveTextContent('As of 2026-08');
    expect(screen.queryByRole('button', { name: 'USE SNAPSHOT' })).not.toBeInTheDocument();
  });

  it('keeps the opening typed before the snapshot resolves', async () => {
    let resolveOpening: (value: unknown) => void = () => {};
    vi.mocked(getProjectionOpeningUseCase.execute).mockReturnValue(
      new Promise((resolve) => {
        resolveOpening = resolve;
      }) as never,
    );
    renderWorkspace();

    const input = await screen.findByLabelText('Opening net worth');
    fireEvent.change(input, { target: { value: '777' } });

    await act(async () => {
      resolveOpening({
        openingNetWorth: 380_000,
        anchorYearMonth: '2026-08',
        assets: 500_000,
        liabilities: 120_000,
      });
    });

    expect(input).toHaveValue(777);
    expect(screen.getByRole('button', { name: 'USE SNAPSHOT' })).toBeInTheDocument();
  });

  it('shows inline schema labels for invalid assumptions', async () => {
    renderWorkspace();

    fireEvent.change(await screen.findByLabelText('Life expectancy'), {
      target: { value: '0' },
    });

    expect(await screen.findByText('超出允許範圍')).toBeInTheDocument();
  });

  it('refreshes the rail indicators after the slider stops and marks later edits outdated', async () => {
    renderWorkspace();
    await fillValidSetup();

    fireEvent.change(screen.getByLabelText('Retirement age'), { target: { value: '61' } });

    const rail = await screen.findByTestId('rail-indicators', {}, { timeout: 2000 });
    await waitFor(() => expect(rail).toHaveTextContent('NT$300,000'), { timeout: 2000 });
    expect(rail).toHaveTextContent('NT$110,250');

    fireEvent.change(screen.getByLabelText('Inflation rate (%)'), { target: { value: '3' } });
    expect(rail).toHaveTextContent('OUTDATED');
  });

  it('includes the current rules and events in the indicator refresh', async () => {
    renderWorkspace();
    await fillValidSetup();

    fireEvent.change(screen.getByLabelText('Retirement age'), { target: { value: '61' } });

    await waitFor(
      () => {
        const [input] = vi.mocked(calculateProjectionWorkflow.execute).mock.lastCall ?? [];
        expect(input?.rules).toHaveLength(1);
        expect(input?.rules?.[0].parameters).toMatchObject({ amount: 1000 });
      },
      { timeout: 2000 },
    );
  });

  it('adds a phase to the first event when an empty year is clicked with nothing selected', async () => {
    renderWorkspace();
    await fillValidSetup();
    const row = await addEvent();
    expect(phaseRows(row)).toHaveLength(1);

    const track = screen.getByRole('toolbar', { name: 'Life event timeline' });
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 600,
      height: 30,
      right: 600,
      bottom: 30,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(track, { clientX: 300, pointerId: 1 });
    fireEvent.pointerUp(track, { clientX: 300, pointerId: 1 });

    expect(eventRows()).toHaveLength(1);
    expect(phaseRows(row)).toHaveLength(2);
  });

  it('dashes the indicators and shows a reason when the refresh fails', async () => {
    vi.mocked(calculateProjectionWorkflow.execute).mockResolvedValue({
      ok: false,
      code: 'PROJECTION_RESOLVE_FAILED',
      errors: [],
      warnings: [],
    });
    renderWorkspace();
    await fillValidSetup();

    fireEvent.change(screen.getByLabelText('Retirement age'), { target: { value: '61' } });

    const rail = await screen.findByTestId('rail-indicators', {}, { timeout: 2000 });
    await waitFor(() => expect(rail).toHaveTextContent('The projection could not be calculated.'), {
      timeout: 2000,
    });
    expect(rail).toHaveTextContent('—');
    expect(screen.getByRole('button', { name: 'CALCULATE' })).toBeEnabled();
  });

  it('shows the retirement year next to the slider', async () => {
    renderWorkspace();
    await fillAssumptions();
    expect(screen.getByTestId('retirement-year')).toHaveTextContent('2050');
  });

  it('keeps birthYear editable on a fresh draft', async () => {
    renderWorkspace();
    expect(await screen.findByLabelText('Birth year')).not.toHaveAttribute('readonly');
  });

  it('starts a fresh draft from default assumptions with the age slider last', async () => {
    renderWorkspace();

    expect(await screen.findByLabelText('Birth year')).toHaveValue(1995);
    expect(screen.getByLabelText('Life expectancy')).toHaveValue(100);
    expect(screen.getByLabelText('Inflation rate (%)')).toHaveValue(2);
    expect(screen.getByLabelText('Annual return rate (%)')).toHaveValue(5);

    const order = [
      'Birth year',
      'Life expectancy',
      'Inflation rate (%)',
      'Annual return rate (%)',
      'Retirement age',
    ].map((label) => screen.getByLabelText(label));
    for (let index = 1; index < order.length; index += 1) {
      expect(
        order[index - 1].compareDocumentPosition(order[index]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it('resets parameters and source when the method changes', async () => {
    renderWorkspace();
    await addRule();

    await choose('Method', 'Percentage');
    expect(within(ruleInspector()).getByLabelText('Ratio (%)')).toBeInTheDocument();
    expect(within(ruleInspector()).queryByLabelText('Source type')).not.toBeInTheDocument();

    await choose('Method', 'Fixed amount');

    expect(within(ruleInspector()).queryByLabelText('Ratio (%)')).not.toBeInTheDocument();
    expect(within(ruleInspector()).getByLabelText('Amount')).toBeInTheDocument();
    expect(within(ruleInspector()).queryByLabelText('Source')).not.toBeInTheDocument();
    expect(within(ruleInspector()).queryByText(/No source selected/)).not.toBeInTheDocument();
  });

  it('swaps end-condition inputs with the union variant', async () => {
    renderWorkspace();
    await addRule('expense');
    expect(within(ruleInspector()).getByLabelText('Side')).toHaveTextContent('Expense');

    await choose('End condition', 'Age');
    expect(within(ruleInspector()).getByLabelText('Age')).toBeInTheDocument();

    await choose('End condition', 'Year');
    expect(within(ruleInspector()).getByLabelText('Year')).toBeInTheDocument();
    expect(within(ruleInspector()).queryByLabelText('Age')).not.toBeInTheDocument();

    await choose('End condition', 'Lifelong');
    expect(within(ruleInspector()).queryByLabelText('Age')).not.toBeInTheDocument();
    expect(within(ruleInspector()).queryByLabelText('Year')).not.toBeInTheDocument();

    await choose('Method', 'Debt amortization');
    expect(within(ruleInspector()).queryByLabelText('End condition')).not.toBeInTheDocument();
    expect(within(ruleInspector()).getAllByText(/follows debt/).length).toBeGreaterThan(0);

    fireEvent.click(within(ruleInspector()).getByLabelText('Source'));
    expect(await screen.findByRole('option', { name: 'Mortgage' })).toBeInTheDocument();
  });

  it('shows baselinePolicy only for inflation/growthRate from a non-rule source and requires it', async () => {
    renderWorkspace();
    await addRule();

    expect(within(ruleInspector()).getByLabelText('Baseline policy')).toBeInTheDocument();

    await choose('Source type', 'Another rule');
    expect(within(ruleInspector()).queryByLabelText('Baseline policy')).not.toBeInTheDocument();

    await choose('Source type', 'Ledger code');
    expect(within(ruleInspector()).getByLabelText('Baseline policy')).toBeInTheDocument();

    await choose('Source', '薪資');
    expect(await within(ruleInspector()).findByText('此規則需要基準政策')).toBeInTheDocument();
  });

  it('routes the source picker by method', async () => {
    renderWorkspace();
    await addRule();
    await confirmRule('Salary');

    await addRule('expense');

    // A percentage draws from the other rules, never from the ledger.
    await choose('Method', 'Percentage');
    fireEvent.click(within(ruleInspector()).getByLabelText('Source'));
    expect(await screen.findByRole('option', { name: 'Salary' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '薪資' })).not.toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('option', { name: 'Salary' })).not.toBeInTheDocument(),
    );

    await choose('Method', 'Fixed amount');
    expect(within(ruleInspector()).queryByLabelText('Source')).not.toBeInTheDocument();
  });

  it('flags sources another rule already uses and counts what is left', async () => {
    renderWorkspace();
    await addRule();
    const source = () => within(ruleInspector()).getByLabelText('Source');

    expect(within(ruleInspector()).getByTestId('unassigned-count')).toHaveTextContent(
      '2 ledger codes still unassigned',
    );

    fireEvent.click(source());
    fireEvent.click(await screen.findByRole('option', { name: /薪資/ }));

    expect(within(ruleInspector()).getByTestId('unassigned-count')).toHaveTextContent(
      '1 ledger codes still unassigned',
    );

    // Same rule does not count as its own user.
    fireEvent.click(source());
    expect(await screen.findByRole('option', { name: /生活費/ })).toBeInTheDocument();
    expect(within(listbox()).queryByText(/used by/)).not.toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    await confirmRule('Salary');
    await addRule('expense');
    fireEvent.click(source());
    expect(await within(listbox()).findByText('used by 1')).toBeInTheDocument();
  });

  it('toggles a rule enabled state', async () => {
    renderWorkspace();
    await addRule();
    const toggle = screen.getByTestId('rule-enabled');

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('deletes a rule from its dialog', async () => {
    renderWorkspace();
    await addRule();
    fireEvent.click(screen.getByRole('button', { name: 'Delete rule' }));
    expect(screen.queryAllByTestId('rule-row')).toHaveLength(0);
    expect(screen.queryByTestId('rule-inspector')).not.toBeInTheDocument();
    expect(screen.getByText(/No income rules yet/)).toBeInTheDocument();
  });

  it('shows the keeps-pace switch only where it has an effect', async () => {
    renderWorkspace();
    await addRule('expense');

    expect(within(ruleInspector()).queryByText('每年至少跟隨通膨')).not.toBeInTheDocument();

    await choose('Method', 'Fixed amount');
    expect(within(ruleInspector()).getByText('每年至少跟隨通膨')).toBeInTheDocument();

    const keepsPace = screen.getByTestId('rule-keeps-pace');
    expect(keepsPace).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(keepsPace);
    expect(keepsPace).toHaveAttribute('aria-checked', 'true');

    await choose('Method', 'Debt amortization');
    expect(within(ruleInspector()).queryByText('每年至少跟隨通膨')).not.toBeInTheDocument();
  });

  it('keeps the flag across a method switch and shows the field on percentage', async () => {
    renderWorkspace();
    await addRule('expense');

    await choose('Method', 'Percentage');
    expect(within(ruleInspector()).getByText('每年至少跟隨通膨')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rule-keeps-pace'));

    await choose('Method', 'Growth rate');
    expect(screen.getByTestId('rule-keeps-pace')).toHaveAttribute('aria-checked', 'true');
  });

  it('applies the plan named in the query without a second confirmation', async () => {
    vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(planFixture);
    const router = renderWorkspace('/retirement/new?plan=plan-1');

    await waitFor(() => expect(screen.getByLabelText('Birth year')).toHaveValue(1970));
    expect(screen.getByLabelText('Birth year')).toHaveAttribute('readonly');
    expect(screen.getByTestId('applied-plan-name')).toHaveTextContent('Early retirement');
    expect(router.state.location.search).toBe('?applied=');
    await act(async () => {
      void router.navigate('/other');
    });
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
  });

  it('applies every group from the plan', async () => {
    vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(planFixture);
    renderWorkspace('/retirement/new?plan=plan-1');

    await waitFor(() => expect(eventRows()).toHaveLength(1));
    const [row] = eventRows();
    expect(within(row).getByLabelText('Event name')).toHaveValue('World trip');
    expect(screen.queryAllByTestId('rule-row')).toHaveLength(0);
  });

  it('starts from a blank setup and warns when the named plan cannot be read', async () => {
    vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(null);
    const router = renderWorkspace('/retirement/new?plan=missing');

    expect(
      await screen.findByText('Could not load this plan. Starting from a blank setup.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Birth year')).toHaveValue(1995);
    expect(screen.getByLabelText('Birth year')).not.toHaveAttribute('readonly');
    expect(screen.queryByTestId('applied-plan-name')).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('?applied=');
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
    await confirmRule('Salary');

    await addRule();
    await choose('Method', 'Percentage');
    fireEvent.click(within(ruleInspector()).getByLabelText('Source'));

    expect(await screen.findByRole('option', { name: 'Salary' })).toBeInTheDocument();
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

  it('shows the plan event phase from the applied plan', async () => {
    vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(planFixture);
    renderWorkspace('/retirement/new?plan=plan-1');

    await waitFor(() => expect(eventRows()).toHaveLength(1));
    const [row] = eventRows();
    expect(within(row).getByLabelText('Type')).toHaveTextContent('Expense');
    expect(within(row).getByLabelText('Start year')).toHaveValue(2040);
  });

  it('disables CALCULATE and explains every readiness blocker', async () => {
    renderWorkspace();
    await screen.findByText('No closed period yet.');

    expect(screen.getByRole('button', { name: 'CALCULATE' })).toBeDisabled();
    const readiness = screen.getByTestId('workspace-action-bar');
    expect(readiness).toHaveTextContent('Add at least one income rule.');
    expect(readiness).toHaveTextContent('Resolve the opening net worth.');

    fireEvent.change(screen.getByLabelText('Life expectancy'), { target: { value: '0' } });
    expect(readiness).toHaveTextContent('Fix the validation errors in the setup.');

    expect(screen.queryByTestId('projection-results')).not.toBeInTheDocument();
    expect(calculateProjectionWorkflow.execute).not.toHaveBeenCalled();
  });

  it('routes back to the start gate from the applied plan block', async () => {
    confirmMock.mockResolvedValue(true);
    vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(planFixture);
    const router = renderWorkspace('/retirement/new?plan=plan-1');

    await waitFor(() => expect(screen.getByTestId('applied-plan-name')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'CHANGE PLAN' }));

    // The pathname is already `/retirement/new`, so only the search proves the
    // leave guard let the change-plan navigation through.
    await waitFor(() => expect(router.state.location.search).toBe('?pick'));
    expect(router.state.location.pathname).toBe('/retirement/new');
  });

  it('opens the life-event timeline first on a narrow screen', async () => {
    const original = window.innerWidth;
    window.innerWidth = 390;
    try {
      vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(planFixture);
      renderWorkspace('/retirement/new?plan=plan-1');

      const timeline = await screen.findByRole('button', { name: 'Timeline' });
      expect(timeline).toHaveClass('border-input');
      expect(screen.getByRole('toolbar', { name: 'Life event timeline' })).toBeVisible();
    } finally {
      window.innerWidth = original;
    }
  });

  it('labels the two stages without competing numbers', () => {
    renderWorkspace();

    const steps = screen.getByRole('list', { name: 'Projection workspace stages' });
    expect(steps).toHaveTextContent('Setup');
    expect(steps).toHaveTextContent('Preview');
    expect(steps).not.toHaveTextContent('01');
  });

  it('shows only the source list on the rail while there is no result yet', () => {
    renderWorkspace();

    const rail = screen.getByTestId('workspace-rail');
    expect(rail.children).toHaveLength(1);
    expect(screen.getByTestId('rail-sources')).toBeInTheDocument();
    expect(screen.queryByTestId('rail-indicators')).not.toBeInTheDocument();
  });

  it('keeps the rail metrics above the source list', async () => {
    renderWorkspace();
    await fillValidSetup();

    fireEvent.change(screen.getByLabelText('Retirement age'), { target: { value: '61' } });

    const indicators = await screen.findByTestId('rail-indicators');
    const sources = screen.getByTestId('rail-sources');
    expect(
      indicators.compareDocumentPosition(sources) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('collapses the unassigned source list after five rows', async () => {
    ledgerCodesMock.codes = Array.from({ length: 10 }, (_, index) => ({
      code: `expense:extra-${index}`,
      label: `Extra ${index}`,
      type: 'expense',
      isCustom: true,
      isActive: true,
    }));
    renderWorkspace();

    const sources = await screen.findByTestId('rail-sources');
    expect(within(sources).getAllByRole('listitem')).toHaveLength(5);

    fireEvent.click(within(sources).getByTestId('rail-sources-toggle'));
    expect(within(sources).getAllByRole('listitem')).toHaveLength(11);
    expect(within(sources).getByRole('button', { name: 'Show less' })).toBeInTheDocument();
  });

  it('treats a disabled rule and an unassigned source as non-blocking', async () => {
    renderWorkspace();
    await fillValidSetup();
    openAdvanced(ruleRows()[0]);
    await waitFor(() => expect(screen.getByTestId('rule-inspector')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('rule-enabled'));
    fireEvent.click(screen.getByTestId('rule-confirm'));
    await waitFor(() => expect(screen.queryByTestId('rule-inspector')).not.toBeInTheDocument());

    expect(screen.getByRole('button', { name: 'CALCULATE' })).toBeEnabled();
    expect(screen.getByTestId('rail-sources')).toHaveTextContent('生活費');
  });

  it('requires an integer manual opening balance', async () => {
    renderWorkspace();
    await screen.findByText('No closed period yet.');
    fireEvent.change(screen.getByLabelText('Birth year'), { target: { value: '1990' } });
    fireEvent.change(screen.getByLabelText('Retirement age'), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText('Life expectancy'), { target: { value: '85' } });
    fireEvent.change(screen.getByLabelText('Inflation rate (%)'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Annual return rate (%)'), { target: { value: '5' } });
    await addRule();
    await choose('Method', 'Fixed amount');
    fireEvent.change(within(ruleInspector()).getByLabelText('Amount'), {
      target: { value: '1000' },
    });
    await confirmRule('Salary');

    expect(screen.getByRole('button', { name: 'CALCULATE' })).toBeDisabled();
    expect(screen.getByTestId('workspace-action-bar')).toHaveTextContent(
      'Resolve the opening net worth.',
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
    await waitFor(() => expect(router.state.location.search).toBe('?applied='));
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
    await waitFor(() => expect(router.state.location.search).toBe('?applied='));
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
    await waitFor(() => expect(router.state.location.search).toBe('?applied='));
  });

  it('falls back to a blank, dirty setup when the source projection is gone', async () => {
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(null);
    const router = renderWorkspace('/retirement/new?from=missing');

    expect(await screen.findByTestId('preload-warning')).toHaveTextContent(
      'Could not resolve the opening balance. Starting from a blank setup with the opening left empty.',
    );
    expect(screen.getByLabelText('Opening net worth')).toHaveValue(null);
    await waitFor(() => expect(router.state.location.search).toBe('?applied='));

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
