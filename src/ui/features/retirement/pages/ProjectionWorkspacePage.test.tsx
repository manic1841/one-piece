import { StrictMode } from 'react';

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import { getProjectionOpeningUseCase } from '@/application/retirement/use_cases/getProjectionOpeningUseCase';
import { getProjectionViewUseCase } from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { getRetirementPlanUseCase } from '@/application/retirement/use_cases/getRetirementPlanUseCase';
import { persistProjectionUseCase } from '@/application/retirement/use_cases/persistProjectionUseCase';
import { calculateProjectionWorkflow } from '@/application/retirement/workflows/calculateProjection';
import { calculateRetirementAge } from '@/application/retirement/workflows/compareRetirementAges';
import { saveWorkspaceAsPlanWorkflow } from '@/application/retirement/workflows/saveWorkspaceAsPlan';
import { type ProjectionInput, type ProjectionResult } from '@/domains/retirement/projectionTypes';
import { type RetirementPlan } from '@/domains/retirement/types';
import { notifySaved } from '@/ui/hooks/notify';

import ProjectionWorkspacePage from './ProjectionWorkspacePage';

// 整頁工作區的每個案例都要真的填完 setup、送計算、等結果落地，最慢的幾個本機就
// 要近 5 秒，而全套件平行跑時最慢的可到 16 秒（逾時值是 per-worker 的 wall clock
// ，不只是這段程式碼的執行時間）。只放寬這個檔案，其餘維持預設：`it`／`describe`
// 的第三引數是唯一入口，`vi.setConfig` 在這一層會被 describe 的值蓋掉。

vi.mock('@/application/retirement/use_cases/getProjectionOpeningUseCase', () => ({
  getProjectionOpeningUseCase: { execute: vi.fn() },
}));

const { openingPeriodsMock } = vi.hoisted(() => ({
  openingPeriodsMock: {
    periods: [] as Array<{ yearMonth: string; netWorth: number }>,
    pinned: null as { yearMonth: string; netWorth: number } | null,
  },
}));

vi.mock('@/application/retirement/workflows/listProjectionOpeningPeriods', () => ({
  OPENING_PERIOD_LIMIT: 12,
  listProjectionOpeningPeriods: {
    execute: vi.fn(() =>
      Promise.resolve({ periods: openingPeriodsMock.periods, pinned: openingPeriodsMock.pinned }),
    ),
  },
}));

vi.mock('@/application/retirement/use_cases/getProjectionViewUseCase', () => ({
  getProjectionViewUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/report/use_cases/listReportsUseCase', () => ({
  listReportsUseCase: { execute: vi.fn(() => Promise.resolve([])) },
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

vi.mock('@/ui/hooks/notify', () => ({
  celebrate: vi.fn(),
  notifyFailed: vi.fn(),
  notifySaved: vi.fn(),
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
  useLedgerCodes: () => ({
    items: ledgerCodesMock.codes,
    loading: false,
    errorMessage: null,
    reload: vi.fn(),
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

vi.mock('@/application/retirement/use_cases/getRetirementPlanUseCase', () => ({
  getRetirementPlanUseCase: { execute: vi.fn() },
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
      inflowItems: [],
      outflowItems: [],
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
      inflowItems: [],
      outflowItems: [],
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
  const calculation = {
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
  };
  return {
    ok: true as const,
    calculation,
    comparisonInput: {
      startYear: calculation.config.startYear,
      opening: calculation.config.openingNetWorth,
      assumptions: calculation.config.assumptions,
      rules: calculation.config.projectionRules,
      lifeEvents: calculation.config.lifeEvents,
      ledgerSources: new Map(),
      debtAccounts: new Map(),
    },
  };
}

/** Baseline starts as a one-line summary; its fields render once expanded. */
async function openBaseline() {
  fireEvent.click(await screen.findByRole('button', { name: 'Edit baseline' }));
  return screen.findByLabelText('Opening net worth');
}

async function fillAssumptions() {
  await screen.findByText('No closed period yet.');
  fireEvent.change(await openBaseline(), { target: { value: '100000' } });
  pickOption('Birth year', '1990');
  pickOption('Retirement age', '60');
  pickOption('Life expectancy', '85');
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
    ['baseline', 'assumptions', 'rules', 'events']
      .map((band) => screen.getByTestId(`section-${band}`).textContent ?? '')
      .join(' | '),
  ).toBeEnabled();
  fireEvent.click(button);
  await screen.findByTestId('projection-results');
}

function renderWorkspace(initialEntry = '/retirement/new') {
  const router = createMemoryRouter(
    [
      { path: '/retirement/new', element: <ProjectionWorkspacePage /> },
      { path: '/retirement', element: <div>retirement</div> },
      { path: '/retirement/projections/:id', element: <div>projection view</div> },
      { path: '/retirement/plans/:id', element: <div>plan view</div> },
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

const balanceSheetReport = (yearMonth: string, assets: number, liabilities: number) => ({
  id: `${yearMonth}-balance_sheet`,
  householdId: 'household-1',
  yearMonth,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  type: 'BALANCE_SHEET',
  data: {
    yearMonth,
    assets: { total: assets, groups: {} },
    liabilities: { total: liabilities, groups: {} },
    equity: { total: assets - liabilities, groups: {} },
  },
});

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

/** Names the rule and completes it, because CONFIRM is held back while it is invalid. */
async function confirmRule(name = 'Rule') {
  const scope = ruleInspector();
  fireEvent.change(within(scope).getByLabelText(/Rule name/), { target: { value: name } });

  const source = within(scope).queryByLabelText('Source');
  const hasSource = source !== null && (source.textContent ?? '').trim() !== 'No source selected.';
  if (hasSource) {
    // A picked source still needs its baseline policy before the rule parses.
    await choose('Baseline policy', 'Previous complete year', scope);
  } else if (within(scope).queryByLabelText('Method') !== null) {
    // No source to fill in: a fixed amount is the shortest source-free rule.
    await choose('Method', 'Fixed amount', scope);
    fireEvent.change(within(scope).getByLabelText('Amount'), { target: { value: '1000' } });
  }

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

/** Keep the CSS viewport and the hook's media query in sync for responsive tests. */
function stubViewport(initialDesktop: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const state = { desktop: initialDesktop };
  const originalWidth = window.innerWidth;
  window.innerWidth = initialDesktop ? 1024 : 390;
  const spy = vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: state.desktop,
        media: query,
        onchange: null,
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
          listeners.add(listener);
        },
        removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
          listeners.delete(listener);
        },
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );

  return {
    set(desktop: boolean) {
      state.desktop = desktop;
      window.innerWidth = desktop ? 1024 : 390;
      window.dispatchEvent(new Event('resize'));
      const event = { matches: desktop } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
    restore: () => {
      window.innerWidth = originalWidth;
      spy.mockRestore();
    },
  };
}

async function addPhase(row: HTMLElement) {
  fireEvent.click(within(row).getByRole('button', { name: 'ADD PHASE' }));
  const phases = await within(row).findAllByTestId('phase-row');
  // New phases are prefilled with the retirement year (2060 in this fixture),
  // which sorts last.
  return phases[phases.length - 1];
}

/** The one place phase fields exist: the sheet below md, the column above it. */
function inspector() {
  return screen.getByTestId('life-event-inspector');
}

/** Selecting a phase row is what loads it into the inspector. */
async function selectPhase(row: HTMLElement, index = 0) {
  fireEvent.click(within(phaseRows(row)[index]).getByRole('button', { name: /Edit phase/ }));
  return screen.findByTestId('life-event-inspector');
}

async function fillPhase(
  values: Partial<{ start: string; end: string; amount: string; growth: string; name: string }>,
) {
  await screen.findByTestId('life-event-inspector');
  if (values.start !== undefined) {
    pickOption(/Start year/, values.start, inspector());
  }
  if (values.end !== undefined) {
    pickOption(/End year/, values.end, inspector());
  }
  if (values.amount !== undefined) {
    fireEvent.change(within(inspector()).getByLabelText(/Amount/), {
      target: { value: values.amount },
    });
  }
  if (values.growth !== undefined) {
    fireEvent.change(within(inspector()).getByLabelText('Growth rate (%)'), {
      target: { value: values.growth },
    });
  }
  if (values.name !== undefined) {
    fireEvent.change(within(inspector()).getByLabelText(/Phase name/), {
      target: { value: values.name },
    });
  }
}

/** The delete pair sits in the hosting drawer's footer, outside the fields. */
function clickDeletePhase() {
  fireEvent.click(screen.getByRole('button', { name: 'Delete phase' }));
}

async function choose(label: string, option: string, scope: HTMLElement = document.body) {
  const trigger = within(scope).getByLabelText(label);
  fireEvent.click(trigger);
  const item = await screen.findByRole('option', { name: option });
  fireEvent.click(item);
}

/** Year and age fields are selects: open the list, choose the value. */
function pickOption(label: string | RegExp, value: string, scope: HTMLElement = document.body) {
  fireEvent.click(within(scope).getByLabelText(label));
  fireEvent.click(screen.getByRole('option', { name: value }));
}

describe('ProjectionWorkspacePage', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
    Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
    Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
    Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  });

  beforeEach(() => {
    window.innerWidth = 390;
    vi.clearAllMocks();
    ledgerCodesMock.codes = [
      { code: 'income:salary', label: '薪資', type: 'income', isCustom: false, isActive: true },
      { code: 'expense:living', label: '生活費', type: 'expense', isCustom: false, isActive: true },
    ];
    confirmMock.mockResolvedValue(false);
    openingPeriodsMock.periods = [];
    openingPeriodsMock.pinned = null;
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([]);
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
      '04 / LIFE EVENTS · 0',
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

    expect(screen.getByRole('region', { name: 'YOUR OUTLOOK' })).toBeInTheDocument();
    expect(screen.getByTestId('workspace-summary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SAVE' })).toBeEnabled();
    expect(screen.queryByLabelText('Opening net worth')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workspace-rail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workspace-pinned-bar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'SAVE AS PLAN' })).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/retirement/new');

    fireEvent.click(screen.getByRole('button', { name: 'BACK TO SETUP' }));

    expect(screen.getByRole('button', { name: 'CALCULATE' })).toBeInTheDocument();
    // A successful calculate drops the indicators, so the rail waits for the next refresh.
    expect(screen.queryByTestId('workspace-rail')).not.toBeInTheDocument();
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

  it('states the settings as labelled facts instead of one run-on line', async () => {
    renderWorkspace();
    await fillValidSetup();
    await calculate();

    const facts = screen.getByTestId('settings-facts');
    expect(within(facts).getByText('Start year')).toBeInTheDocument();
    expect(within(facts).getByText('Retirement')).toBeInTheDocument();
    expect(within(facts).getByText('60 (2050) to 85')).toBeInTheDocument();
    expect(within(facts).getByText('Inflation · Return')).toBeInTheDocument();
    expect(within(facts).getByText('2% · 5%')).toBeInTheDocument();
    expect(within(facts).getByText('Income rules · Events')).toBeInTheDocument();
    expect(within(facts).getByText('1 · 0')).toBeInTheDocument();
    // The run-on sentence is gone; the opening amount now lives in the details.
    expect(facts).not.toHaveTextContent('NT$100,000');
  });

  it('marks empty setup groups as none and drops their toggle', async () => {
    renderWorkspace();
    await fillValidSetup();
    await calculate();

    const summary = screen.getByTestId('workspace-summary');
    const expense = within(summary).getByTestId('summary-EXPENSE');
    const events = within(summary).getByTestId('summary-04');

    expect(expense).toHaveTextContent('None');
    expect(events).toHaveTextContent('None');
    expect(within(expense).queryByRole('button', { name: 'Show summary' })).not.toBeInTheDocument();
    expect(within(events).queryByRole('button', { name: 'Show summary' })).not.toBeInTheDocument();
    // Income has a rule, so it keeps both the count and the toggle.
    const income = within(summary).getByTestId('summary-03');
    expect(income).not.toHaveTextContent('None');
    fireEvent.click(within(income).getByRole('button', { name: 'Show summary' }));
    expect(income).toHaveTextContent('Salary');
  });

  it('does not present an empty projection as a successful retirement outlook', async () => {
    const outcome = successOutcome();
    outcome.calculation.input = { ...projectionInput, years: [] };
    outcome.calculation.result = { ...projectionResult, years: [] };
    vi.mocked(calculateProjectionWorkflow.execute).mockResolvedValue(outcome);
    renderWorkspace();
    await fillValidSetup();
    await calculate();
    expect(screen.getByRole('region', { name: 'YOUR OUTLOOK' })).toHaveTextContent(
      'No projection years. Go back to setup and review the start year.',
    );
    expect(screen.queryByText(/Your assets last through/)).not.toBeInTheDocument();
  });

  it('gives negative net worth the warning tone without toning positive metrics', async () => {
    const outcome = successOutcome();
    outcome.calculation.result = {
      ...projectionResult,
      summary: { ...projectionResult.summary, minNetWorth: -1, finalNetWorth: -2 },
    };
    vi.mocked(calculateProjectionWorkflow.execute).mockResolvedValue(outcome);
    renderWorkspace();
    await fillValidSetup();
    await calculate();

    expect(
      screen.getByTestId('metric-min-net-worth').querySelector('.text-negative'),
    ).not.toBeNull();
    expect(
      screen.getByTestId('metric-final-net-worth').querySelector('.text-negative'),
    ).not.toBeNull();
    expect(
      screen.getByTestId('metric-retirement-net-worth').querySelector('.text-negative'),
    ).toBeNull();
  });

  it('compares without changing the preview, then applies and saves a consistent retirement age', async () => {
    vi.mocked(calculateProjectionWorkflow.execute).mockImplementation(async (request) =>
      calculateRetirementAge(
        {
          startYear: request.startYear,
          opening: {
            source: request.opening.source,
            amount: request.opening.amount,
            anchorYearMonth: request.opening.anchorYearMonth,
          },
          assumptions: request.assumptions,
          rules: request.rules,
          lifeEvents: request.lifeEvents,
          ledgerSources: new Map(),
          debtAccounts: new Map(),
        },
        request.assumptions.retirementAge,
        2026,
      ),
    );
    const router = renderWorkspace();
    await fillValidSetup();
    await calculate();
    const calls = vi.mocked(calculateProjectionWorkflow.execute).mock.calls.length;
    const comparison = within(screen.getByRole('region', { name: 'WHAT IF YOU RETIRE…' }));
    const currentRetirement = screen.getByTestId('metric-retirement-net-worth').textContent;
    const chart = screen.getByRole('slider', {
      name: 'Net worth projection by year',
    }).parentElement;
    const chartBefore = chart?.innerHTML;
    expect(comparison.getByRole('button', { name: 'USE AGE 60' })).toBeDisabled();
    fireEvent.click(comparison.getByRole('button', { name: 'Retire one year earlier' }));
    expect(comparison.getByRole('columnheader', { name: 'Try · 59' })).toBeInTheDocument();
    expect(screen.getByTestId('metric-retirement-net-worth').textContent).toBe(currentRetirement);
    expect(chart?.innerHTML).toBe(chartBefore);
    expect(calculateProjectionWorkflow.execute).toHaveBeenCalledTimes(calls);

    fireEvent.click(comparison.getByRole('button', { name: 'USE AGE 59' }));
    await screen.findByRole('columnheader', { name: 'Current · 59' });
    expect(screen.getByTestId('metric-retirement-net-worth').textContent).not.toBe(
      currentRetirement,
    );
    expect(screen.getByTestId('metric-retirement-net-worth')).toHaveTextContent('Age 59 · 2049');
    expect(calculateProjectionWorkflow.execute).toHaveBeenCalledTimes(calls);

    fireEvent.click(screen.getByRole('button', { name: 'SAVE', exact: true }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Projection name'), {
      target: { value: 'Retire at 59' },
    });
    fireEvent.click(dialog.getByRole('button', { name: 'SAVE', exact: true }));
    await waitFor(() => expect(persistProjectionUseCase.execute).toHaveBeenCalled());
    const saved = vi.mocked(persistProjectionUseCase.execute).mock.lastCall?.[0].calculation;
    expect(saved?.config.assumptions.retirementAge).toBe(59);
    expect(saved?.input.retirementYear).toBe(2049);
    expect(saved?.result.years.find((year) => year.year === 2049)?.isRetired).toBe(true);
    expect(saved?.result.years.find((year) => year.year === 2048)?.isRetired).toBe(false);
    expect(saved).not.toHaveProperty('comparisonInput');

    expect(await screen.findByText('projection view')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/retirement/projections/projection-1');
  });

  it('seeds the opening from the latest closed period and swaps it from the dialog', async () => {
    vi.mocked(getProjectionOpeningUseCase.execute).mockResolvedValue({
      openingNetWorth: 380_000,
      anchorYearMonth: '2026-08',
      assets: 500_000,
      liabilities: 120_000,
    });
    openingPeriodsMock.periods = [
      { yearMonth: '2026-08', netWorth: 380_000 },
      { yearMonth: '2026-03', netWorth: 250_000 },
    ];
    renderWorkspace();

    const input = await openBaseline();
    await waitFor(() => expect(input).toHaveValue(380000));
    expect(screen.getByTestId('opening-net-worth-note')).toHaveTextContent('As of 2026-08');

    fireEvent.change(input, { target: { value: '260000' } });
    expect(input).toHaveValue(260000);
    expect(screen.queryByTestId('opening-net-worth-note')).not.toBeInTheDocument();

    // USE CLOSED stays available: it is a source picker now, not an undo.
    fireEvent.click(screen.getByRole('button', { name: 'USE CLOSED' }));
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.click(await dialog.findByTestId('opening-period-2026-03'));

    expect(input).toHaveValue(250000);
    expect(screen.getByTestId('opening-net-worth-note')).toHaveTextContent('As of 2026-03');
  });

  it('pins the current anchor above a window it is missing from', async () => {
    vi.mocked(getProjectionOpeningUseCase.execute).mockResolvedValue({
      openingNetWorth: 380_000,
      anchorYearMonth: '2025-07',
      assets: 500_000,
      liabilities: 120_000,
    });
    openingPeriodsMock.periods = [{ yearMonth: '2026-08', netWorth: 250_000 }];
    openingPeriodsMock.pinned = { yearMonth: '2025-07', netWorth: 380_000 };
    renderWorkspace();

    const input = await openBaseline();
    await waitFor(() => expect(input).toHaveValue(380000));
    fireEvent.click(screen.getByRole('button', { name: 'USE CLOSED' }));

    const dialog = within(await screen.findByRole('dialog'));
    const pinnedRow = await dialog.findByTestId('opening-period-2025-07');
    expect(pinnedRow).toHaveAttribute('aria-current', 'true');
    expect(pinnedRow).toHaveTextContent('380,000');
  });

  it('keeps the opening typed before the snapshot resolves', async () => {
    let resolveOpening: (value: unknown) => void = () => {};
    vi.mocked(getProjectionOpeningUseCase.execute).mockReturnValue(
      new Promise((resolve) => {
        resolveOpening = resolve;
      }) as never,
    );
    renderWorkspace();

    const input = await openBaseline();
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
    expect(screen.getByRole('button', { name: 'USE CLOSED' })).toBeInTheDocument();
  });

  it('shows inline schema labels for invalid assumptions', async () => {
    renderWorkspace();

    pickOption('Life expectancy', '30');

    expect(await screen.findByText('預期壽命必須大於退休年齡')).toBeInTheDocument();
  });

  it('refreshes the rail indicators after the slider stops and marks later edits outdated', async () => {
    renderWorkspace();
    await fillValidSetup();

    pickOption('Retirement age', '61');

    const rail = await screen.findByTestId('rail-indicators', {}, { timeout: 2000 });
    await waitFor(() => expect(rail).toHaveTextContent('NT$300,000'), { timeout: 2000 });
    expect(rail).toHaveTextContent('NT$110,250');

    fireEvent.change(screen.getByLabelText('Inflation rate (%)'), { target: { value: '3' } });
    expect(rail).toHaveTextContent('OUTDATED');
  });

  it('includes the current rules and events in the indicator refresh', async () => {
    renderWorkspace();
    await fillValidSetup();

    pickOption('Retirement age', '61');

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
    const viewport = stubViewport(true);
    try {
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
    } finally {
      viewport.restore();
    }
  });

  it('shows the owning event in the inspector and moves the phase from it', async () => {
    renderWorkspace();
    const other = await addEvent();
    // The newest phase is the selected one, so its row is the inspector's.
    const owner = await addEvent();

    await fillPhase({ name: 'World trip' });

    const inspector = screen.getByTestId('life-event-inspector');
    const select = within(inspector).getByLabelText('Belongs to event');
    // The owner is listed, so the field is never blank and shows where the
    // phase currently belongs.
    const ownerName = (select.textContent ?? '').trim();
    expect(ownerName).not.toBe('');

    fireEvent.click(select);
    const options = await screen.findAllByRole('option');
    const target = options.find((option) => (option.textContent ?? '').trim() !== ownerName);
    expect(target).toBeDefined();
    fireEvent.click(target as HTMLElement);

    expect(await within(other).findByText('World trip')).toBeInTheDocument();
    // The row it left keeps a blank phase instead of going empty.
    expect(within(owner).queryByText('World trip')).not.toBeInTheDocument();
    expect(within(owner).getAllByTestId('phase-row')).toHaveLength(1);
  }, 20_000);

  it('dashes the indicators and shows a reason when the refresh fails', async () => {
    vi.mocked(calculateProjectionWorkflow.execute).mockResolvedValue({
      ok: false,
      code: 'PROJECTION_RESOLVE_FAILED',
      errors: [],
      warnings: [],
    });
    renderWorkspace();
    await fillValidSetup();

    pickOption('Retirement age', '61');

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
    expect(await screen.findByLabelText('Birth year')).not.toBeDisabled();
  });

  it('starts a fresh draft from default assumptions, ages before rates', async () => {
    renderWorkspace();

    expect(await screen.findByLabelText('Birth year')).toHaveTextContent('1995');
    expect(screen.getByLabelText('Life expectancy')).toHaveTextContent('100');
    expect(screen.getByLabelText('Inflation rate (%)')).toHaveValue('2');
    expect(screen.getByLabelText('Annual return rate (%)')).toHaveValue('5');

    const order = [
      'Birth year',
      'Retirement age',
      'Life expectancy',
      'Inflation rate (%)',
      'Annual return rate (%)',
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
    const salary = await screen.findByRole('option', { name: /薪資/ });

    // Regression: cmdk renders `data-disabled="false"` on every row, so the picker
    // must key its disabled styling on the value. A bare `data-[disabled]` variant
    // disabled pointer events on all rows and made the whole list unclickable.
    expect(salary).toHaveClass('data-[disabled=true]:pointer-events-none');

    fireEvent.click(salary);
    expect(source()).toHaveTextContent('薪資');

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

  it('asks for the side before the method, because the side narrows the method list', async () => {
    renderWorkspace();
    await addRule();
    const side = within(ruleInspector()).getByLabelText('Side');
    const method = within(ruleInspector()).getByLabelText('Method');

    expect(side.compareDocumentPosition(method) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('names a detail code after its parent so sibling details stay apart', async () => {
    ledgerCodesMock.codes = [
      { code: 'income:salary', label: '薪資', type: 'income', isCustom: false, isActive: true },
      {
        code: 'income:salary:bonus',
        label: '年終',
        type: 'income',
        isCustom: true,
        isActive: true,
      },
      { code: 'expense:living', label: '生活費', type: 'expense', isCustom: false, isActive: true },
    ];

    renderWorkspace();
    await addRule();
    fireEvent.click(within(ruleInspector()).getByLabelText('Source'));

    expect(await screen.findByRole('option', { name: '薪資 › 年終' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '薪資' })).toBeInTheDocument();
  });

  it('toggles a rule enabled state', async () => {
    renderWorkspace();
    await addRule();
    const toggle = screen.getByTestId('rule-enabled');

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('holds the rule dialog open until the marked fields are filled', async () => {
    renderWorkspace();
    await addRule();
    const confirm = screen.getByTestId('rule-confirm');
    const name = within(ruleInspector()).getByLabelText(/Rule name/);

    // ADD no longer closes over an unusable rule: the dialog stays and says why.
    expect(confirm).toBeDisabled();
    fireEvent.change(name, { target: { value: 'Salary' } });
    expect(confirm).toBeDisabled();
    expect(screen.getByText('Fix the marked fields to close this rule.')).toBeInTheDocument();
    // The empty source is the field it flags, so the reason is on screen too.
    expect(within(ruleInspector()).getByText('來源 id 必填')).toBeInTheDocument();

    await choose('Method', 'Fixed amount');
    fireEvent.change(within(ruleInspector()).getByLabelText('Amount'), {
      target: { value: '1000' },
    });

    expect(confirm).toBeEnabled();
    expect(screen.queryByText('Fix the marked fields to close this rule.')).not.toBeInTheDocument();

    fireEvent.click(confirm);
    await waitFor(() => expect(screen.queryByTestId('rule-inspector')).not.toBeInTheDocument());
    expect(ruleRows()).toHaveLength(1);
  });

  it('deletes a rule from its dialog', async () => {
    renderWorkspace();
    await addRule();
    fireEvent.click(screen.getByRole('button', { name: 'Delete rule' }));
    expect(screen.queryAllByTestId('rule-row')).toHaveLength(0);
    expect(screen.queryByTestId('rule-inspector')).not.toBeInTheDocument();
    // Both sides are empty, so the whole-section empty state replaces the groups.
    expect(screen.getByText(/No projection rules yet/)).toBeInTheDocument();
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

    await waitFor(() => expect(screen.getByLabelText('Birth year')).toHaveTextContent('1970'));
    expect(screen.getByLabelText('Birth year')).toBeDisabled();
    expect(screen.getByTestId('applied-plan-name')).toHaveTextContent('Early retirement');
    expect(router.state.location.search).toBe('');
    await act(async () => {
      void router.navigate('/other');
    });
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
  });

  it('does not prompt when stripping the plan query from an already dirty workspace', async () => {
    let resolvePlan: (plan: typeof planFixture) => void = () => {};
    vi.mocked(getRetirementPlanUseCase.execute).mockReturnValue(
      new Promise((resolve) => {
        resolvePlan = resolve;
      }),
    );
    const router = renderWorkspace('/retirement/new?plan=plan-1');

    fireEvent.change(await screen.findByLabelText('Inflation rate (%)'), {
      target: { value: '3' },
    });
    await act(async () => resolvePlan(planFixture));

    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('applies every group from the plan', async () => {
    vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(planFixture);
    renderWorkspace('/retirement/new?plan=plan-1');

    await waitFor(() => expect(eventRows()).toHaveLength(1));
    const [row] = eventRows();
    // Rows are summaries; the name is text, not an input.
    expect(row).toHaveTextContent('World trip');
    expect(screen.queryAllByTestId('rule-row')).toHaveLength(0);
  });

  it('starts from a blank setup and warns when the named plan cannot be read', async () => {
    vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(null);
    const router = renderWorkspace('/retirement/new?plan=missing');

    expect(
      await screen.findByText('Could not load this plan. Starting from a blank setup.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Birth year')).toHaveTextContent('1995');
    expect(screen.getByLabelText('Birth year')).not.toBeDisabled();
    expect(screen.queryByTestId('applied-plan-name')).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('adds, types, toggles and deletes a life event with no source picker', async () => {
    renderWorkspace();
    const row = await addEvent();

    expect(within(inspector()).queryByLabelText('Source')).not.toBeInTheDocument();
    expect(within(inspector()).queryByLabelText('Source type')).not.toBeInTheDocument();

    const type = within(inspector()).getByRole('switch', { name: 'Type' });
    expect(type).not.toBeChecked();
    fireEvent.click(type);
    expect(type).toBeChecked();
    expect(row).toHaveTextContent('Expense');

    const toggle = within(row).getByRole('switch', { name: 'Enabled' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(within(row).getByRole('button', { name: 'Delete event' }));
    expect(screen.queryAllByTestId('event-row')).toHaveLength(0);
    expect(screen.getByText(/No life events yet/)).toBeInTheDocument();
  });

  it('keeps events out of a rule percentage source list', async () => {
    renderWorkspace();
    await addEvent();
    fireEvent.change(within(inspector()).getByLabelText(/Event name/), {
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

    await fillPhase({ start: '2040', end: '2041', amount: '1' });
    const added = await addPhase(row);
    // A list-added phase is selected and already carries the retirement year.
    await waitFor(() =>
      expect(within(inspector()).getByLabelText(/Start year/)).toHaveTextContent('2060'),
    );
    expect(added).toHaveTextContent('2060');

    await fillPhase({ start: '2030', end: '2031', amount: '1' });
    await addPhase(row);
    await fillPhase({ start: '2035', end: '2036', amount: '1' });

    await waitFor(() =>
      expect(phaseRows(row).map((phase) => phase.textContent)).toEqual([
        expect.stringContaining('2030–2031'),
        expect.stringContaining('2035–2036'),
        expect.stringContaining('2040–2041'),
      ]),
    );
  }, 30_000);

  it('blocks overlapping phases and focuses the offending start year', async () => {
    renderWorkspace();
    const row = await addEvent();

    await fillPhase({ start: '2020', end: '2030', amount: '1' });
    await addPhase(row);
    await fillPhase({ start: '2035', end: '2040', amount: '1' });
    pickOption(/Start year/, '2025', inspector());

    expect(await screen.findByText('階段不可重疊')).toBeInTheDocument();
    // The list is hidden at this width; the inspector holds the same fields.
    await waitFor(() =>
      expect(
        within(screen.getByTestId('life-event-inspector')).getByLabelText(/Start year/),
      ).toHaveFocus(),
    );
  }, 20_000);

  it('blocks an end year before the start and focuses the end year', async () => {
    renderWorkspace();
    await addEvent();

    await fillPhase({ start: '2050', end: '2040', amount: '1' });

    expect(await screen.findByText('結束年度不得早於開始年度')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(screen.getByTestId('life-event-inspector')).getByLabelText(/End year/),
      ).toHaveFocus(),
    );
  }, 20_000);

  it('validates amount, growth rate and requires one phase', async () => {
    renderWorkspace();
    const row = await addEvent();

    await fillPhase({ start: '2040', end: '2041', amount: '-1', growth: '25' });

    expect(await screen.findByText('金額不得為負')).toBeInTheDocument();
    expect(screen.getByText('成長率必須介於 -10% 到 20%')).toBeInTheDocument();

    clickDeletePhase();
    // The event keeps a blank phase on the same years instead of going empty.
    expect(phaseRows(row)).toHaveLength(1);
    expect(within(inspector()).getByLabelText(/Start year/)).toHaveTextContent('2040');
    expect(screen.queryByText('事件至少需要一個階段')).not.toBeInTheDocument();
  });

  it('accepts a blank optional phase name', async () => {
    renderWorkspace();
    await addEvent();

    await fillPhase({ start: '2040', end: '2041', amount: '500' });

    expect(screen.queryByText('階段名稱不可留白')).not.toBeInTheDocument();
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
    expect(row).toHaveTextContent('Expense');
    await selectPhase(row);
    await waitFor(() =>
      expect(within(inspector()).getByLabelText(/Start year/)).toHaveTextContent('2040'),
    );
  });

  it('disables CALCULATE and explains every readiness blocker on its band', async () => {
    renderWorkspace();
    await screen.findByText('No closed period yet.');

    expect(screen.getByRole('button', { name: 'CALCULATE' })).toBeDisabled();
    expect(screen.getByTestId('section-rules')).toHaveTextContent('Add at least one income rule.');
    expect(screen.getByTestId('section-baseline')).toHaveTextContent(
      'Resolve the opening net worth.',
    );
    expect(screen.getByTestId('section-assumptions')).not.toHaveTextContent(
      'Fix the validation errors in the setup.',
    );

    pickOption('Life expectancy', '30');
    expect(screen.getByTestId('section-assumptions')).toHaveTextContent(
      'Fix the validation errors in the setup.',
    );
    // The schema blocker is global; it is hung only on the band that holds the
    // invalid row instead of being repeated everywhere.
    expect(screen.getByTestId('section-rules')).not.toHaveTextContent(
      'Fix the validation errors in the setup.',
    );

    expect(screen.queryByTestId('projection-results')).not.toBeInTheDocument();
    expect(calculateProjectionWorkflow.execute).not.toHaveBeenCalled();
  });

  it('leaves the workspace from the page header back button', async () => {
    const router = renderWorkspace();
    await screen.findByText('No closed period yet.');

    fireEvent.click(screen.getByRole('button', { name: 'BACK TO PROJECTIONS' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/retirement'));
  });

  it('keeps the action bar free of blocker text and marks only invalid bands', async () => {
    renderWorkspace();
    await screen.findByText('No closed period yet.');

    expect(screen.getByTestId('workspace-action-bar')).not.toHaveTextContent(
      'Add at least one income rule.',
    );

    // Missing values explain themselves without a glyph; an invalid field gets one.
    expect(screen.getByTestId('section-rules')).not.toHaveTextContent('error');
    pickOption('Life expectancy', '30');
    expect(screen.getByTestId('section-assumptions')).toHaveTextContent('error');
  });

  it('opens the start picker from the applied plan block and swaps the plan after confirming', async () => {
    confirmMock.mockResolvedValue(true);
    vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(planFixture);
    planLibraryMock.plans = [
      {
        id: 'plan-2',
        name: 'Later retirement',
        retirementAge: 65,
        lifeExpectancy: 90,
        inflationRate: 0.02,
        annualReturnRate: 0.05,
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
      },
    ];
    const router = renderWorkspace('/retirement/new?plan=plan-1');

    await waitFor(() => expect(screen.getByTestId('applied-plan-name')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'CHANGE PLAN' }));

    fireEvent.click(await screen.findByTestId('plan-option-plan-2'));

    await waitFor(() => expect(router.state.location.search).toBe('?plan=plan-2'));
    expect(confirmMock).toHaveBeenCalledTimes(1);
  });

  it('offers the picker from the header on a blank start', async () => {
    planLibraryMock.plans = [
      {
        id: 'plan-2',
        name: 'Later retirement',
        retirementAge: 65,
        lifeExpectancy: 90,
        inflationRate: 0.02,
        annualReturnRate: 0.05,
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
      },
    ];
    renderWorkspace();

    fireEvent.click(screen.getByRole('button', { name: 'CHANGE PLAN' }));

    expect(await screen.findByTestId('plan-option-plan-2')).toBeInTheDocument();
  });

  it('keeps the picker open when the change is not confirmed', async () => {
    confirmMock.mockResolvedValue(false);
    vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(planFixture);
    planLibraryMock.plans = [
      {
        id: 'plan-2',
        name: 'Later retirement',
        retirementAge: 65,
        lifeExpectancy: 90,
        inflationRate: 0.02,
        annualReturnRate: 0.05,
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
      },
    ];
    const router = renderWorkspace('/retirement/new?plan=plan-1');

    await waitFor(() => expect(screen.getByTestId('applied-plan-name')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'CHANGE PLAN' }));
    fireEvent.click(await screen.findByTestId('plan-option-plan-2'));

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('starts over blank from the picker after confirming', async () => {
    confirmMock.mockResolvedValue(true);
    vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(planFixture);
    const router = renderWorkspace('/retirement/new?plan=plan-1');

    await waitFor(() => expect(screen.getByTestId('applied-plan-name')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'CHANGE PLAN' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Start blank/ }));

    await waitFor(() => expect(router.state.location.search).toBe(''));
    await waitFor(() => expect(screen.queryByTestId('applied-plan-name')).not.toBeInTheDocument());
  });

  it('re-applies the same plan when it is picked again, dropping the edits', async () => {
    confirmMock.mockResolvedValue(true);
    vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(planFixture);
    planLibraryMock.plans = [
      {
        id: 'plan-1',
        name: 'Early retirement',
        retirementAge: 55,
        lifeExpectancy: 90,
        inflationRate: 0.02,
        annualReturnRate: 0.05,
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
      },
    ];
    renderWorkspace('/retirement/new?plan=plan-1');

    await waitFor(() => expect(screen.getByTestId('applied-plan-name')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Inflation rate (%)'), { target: { value: '7' } });
    expect(screen.getByLabelText('Inflation rate (%)')).toHaveValue('7');

    fireEvent.click(screen.getByRole('button', { name: 'CHANGE PLAN' }));
    fireEvent.click(await screen.findByTestId('plan-option-plan-1'));

    await waitFor(() => expect(screen.getByLabelText('Inflation rate (%)')).toHaveValue('2'));
  });

  it('opens the life-event list first on a narrow screen', async () => {
    const original = window.innerWidth;
    window.innerWidth = 390;
    try {
      vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(planFixture);
      renderWorkspace('/retirement/new?plan=plan-1');

      const list = await screen.findByRole('button', { name: 'List' });
      expect(list).toHaveClass('border-input');
      expect(screen.getByRole('button', { name: 'Timeline' })).not.toHaveClass('border-input');
    } finally {
      window.innerWidth = original;
    }
  });

  it('mounts the inspector once, in the column or in the sheet', async () => {
    const viewport = stubViewport(true);
    try {
      vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(planFixture);
      renderWorkspace('/retirement/new?plan=plan-1');

      // The plan is applied on a timeout; acting before it lands gets overwritten.
      await screen.findByTestId('applied-plan-name');
      expect(screen.getByText('Select a phase to edit it.')).toBeInTheDocument();
      const row = await addEvent();
      await addPhase(row);
      expect(screen.getAllByTestId('life-event-inspector')).toHaveLength(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const period = () =>
        within(screen.getByTestId('life-event-inspector')).getByRole('group', { name: 'Period' });
      const years = () =>
        within(period())
          .getAllByRole('combobox')
          .map((box) => box.textContent);
      const before = years();

      act(() => viewport.set(false));
      // The column leaves the tree below the breakpoint, so nothing is mounted
      // until the sheet opens.
      await waitFor(() =>
        expect(screen.queryByTestId('life-event-inspector')).not.toBeInTheDocument(),
      );

      act(() => viewport.set(true));
      expect(await screen.findByText('04 / LIFE EVENTS · 2')).toBeInTheDocument();
      await waitFor(() => expect(screen.getAllByTestId('life-event-inspector')).toHaveLength(1));
      // The remounted inspector reads the same draft, not a stale mirror.
      expect(years()).toEqual(before);
    } finally {
      viewport.restore();
    }
  });

  it('opens the sheet for a new phase and drops the selection when it closes', async () => {
    const viewport = stubViewport(false);
    try {
      vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(planFixture);
      renderWorkspace('/retirement/new?plan=plan-1');

      await screen.findByTestId('applied-plan-name');
      const row = await addEvent();
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText('Details')).toBeInTheDocument();
      expect(screen.getAllByTestId('life-event-inspector')).toHaveLength(1);

      // A fresh phase is incomplete, so close is held back until it is filled.
      const close = within(dialog).getByRole('button', { name: 'Close' });
      fireEvent.click(close);
      expect(screen.getByTestId('phase-blocked-hint')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await fillPhase({ amount: '1' });
      fireEvent.click(close);
      await waitFor(() =>
        expect(screen.queryByTestId('life-event-inspector')).not.toBeInTheDocument(),
      );

      // An ADD outside the sheet brings it back on the phase it created.
      fireEvent.click(within(row).getByRole('button', { name: 'ADD PHASE' }));
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
      expect(screen.getAllByTestId('life-event-inspector')).toHaveLength(1);
    } finally {
      viewport.restore();
    }
  });

  it('keeps a blank phase and lands focus on it after deleting the last one', async () => {
    const viewport = stubViewport(false);
    try {
      vi.mocked(getRetirementPlanUseCase.execute).mockResolvedValue(planFixture);
      renderWorkspace('/retirement/new?plan=plan-1');

      await screen.findByTestId('applied-plan-name');
      await addEvent();
      const dialog = await screen.findByRole('dialog');
      const before = screen.getAllByTestId('phase-row').length;

      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete phase' }));

      // An event never holds zero phases, so the last one is replaced in place
      // and the sheet stays open on the newcomer.
      await waitFor(() => expect(screen.getAllByTestId('phase-row')).toHaveLength(before));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      await waitFor(() =>
        expect(
          within(screen.getByTestId('life-event-inspector')).getByLabelText(/Start year/),
        ).toHaveFocus(),
      );
    } finally {
      viewport.restore();
    }
  });

  it('replaces the last phase deleted from the inspector and focuses the column', async () => {
    const viewport = stubViewport(true);
    try {
      renderWorkspace();

      const row = await addEvent();
      // One phase to begin with: deleting it must not leave the event empty.
      expect(within(row).getAllByTestId('phase-row')).toHaveLength(1);
      clickDeletePhase();

      await waitFor(() =>
        expect(within(eventRows()[0]).getAllByTestId('phase-row')).toHaveLength(1),
      );
      // The list is hidden at this width, so the inspector is where focus belongs.
      await waitFor(() =>
        expect(
          within(screen.getByTestId('life-event-inspector')).getByLabelText(/Start year/),
        ).toHaveFocus(),
      );
    } finally {
      viewport.restore();
    }
  });

  it('drops the selection and returns focus to ADD EVENT when other phases remain', async () => {
    renderWorkspace();

    await addEvent();
    await addPhase(eventRows()[0]);
    expect(screen.getAllByTestId('life-event-inspector')).toHaveLength(1);

    const phasesBefore = within(eventRows()[0]).queryAllByTestId('phase-row').length;
    clickDeletePhase();

    await waitFor(() =>
      expect(within(eventRows()[0]).queryAllByTestId('phase-row')).toHaveLength(phasesBefore - 1),
    );
    // The selection goes with the phase, so the sheet closes and focus returns
    // to the section's ADD.
    await waitFor(() =>
      expect(screen.queryByTestId('life-event-inspector')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByText('ADD EVENT')).toHaveFocus(), { timeout: 1000 });
  });

  it('labels the two stages without competing numbers', () => {
    renderWorkspace();
    const steps = screen.getByRole('list', { name: 'Projection workspace stages' });
    expect(steps).toHaveTextContent('Setup');
    expect(steps).toHaveTextContent('Preview');
    expect(steps).not.toHaveTextContent('01');
  });

  it('keeps the rail out of the layout until the first indicator refresh', async () => {
    renderWorkspace();
    await screen.findByText('No closed period yet.');
    expect(screen.queryByTestId('workspace-rail')).not.toBeInTheDocument();

    pickOption('Retirement age', '61');

    const rail = await screen.findByTestId('workspace-rail', {}, { timeout: 2000 });
    expect(within(rail).getByTestId('rail-indicators')).toBeInTheDocument();
  });

  it('treats a disabled rule as non-blocking', async () => {
    renderWorkspace();
    await fillValidSetup();
    openAdvanced(ruleRows()[0]);
    await waitFor(() => expect(screen.getByTestId('rule-inspector')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('rule-enabled'));
    fireEvent.click(screen.getByTestId('rule-confirm'));
    await waitFor(() => expect(screen.queryByTestId('rule-inspector')).not.toBeInTheDocument());

    expect(screen.getByRole('button', { name: 'CALCULATE' })).toBeEnabled();
  });

  it('requires an integer manual opening balance', async () => {
    renderWorkspace();
    await screen.findByText('No closed period yet.');
    pickOption('Birth year', '1990');
    pickOption('Retirement age', '60');
    pickOption('Life expectancy', '85');
    fireEvent.change(screen.getByLabelText('Inflation rate (%)'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Annual return rate (%)'), { target: { value: '5' } });
    await addRule();
    await choose('Method', 'Fixed amount');
    fireEvent.change(within(ruleInspector()).getByLabelText('Amount'), {
      target: { value: '1000' },
    });
    await confirmRule('Salary');

    expect(screen.getByRole('button', { name: 'CALCULATE' })).toBeDisabled();
    expect(screen.getByTestId('section-baseline')).toHaveTextContent(
      'Resolve the opening net worth.',
    );
    expect(screen.queryByTestId('projection-results')).not.toBeInTheDocument();
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
    // The figure counts up from zero on arrival (M07), so the settled value is awaited.
    await waitFor(() =>
      expect(screen.getByTestId('metric-retirement-net-worth')).toHaveTextContent('NT$300,000'),
    );
    expect(screen.getByRole('region', { name: 'YOUR OUTLOOK' })).toHaveTextContent(
      'Your assets last through age 85.',
    );
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

    await waitFor(() => expect(screen.getByLabelText('Birth year')).toHaveTextContent('1990'));
    expect(await openBaseline()).toHaveValue(123456);
    expect(screen.getByLabelText('Birth year')).toBeDisabled();
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(getProjectionOpeningUseCase.execute).not.toHaveBeenCalled();

    await act(async () => {
      void router.navigate('/other');
    });
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
  });

  it('copies a derived opening from the projection without re-resolving it', async () => {
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(
      preloadConfig({
        openingNetWorth: { amount: 123000, source: 'derived', anchorYearMonth: '2026-01' },
      }) as never,
    );
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([
      balanceSheetReport('2026-01', 150_000, 20_000),
    ]);
    const router = renderWorkspace('/retirement/new?from=projection-1');

    const input = await openBaseline();
    await waitFor(() => expect(input).toHaveValue(123000));
    expect(screen.getByTestId('opening-net-worth-note')).toHaveTextContent('As of 2026-01');
    expect(screen.getByLabelText('Birth year')).toHaveTextContent('1990');
    expect(getProjectionOpeningUseCase.execute).not.toHaveBeenCalled();
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('falls back to the latest closed month when the anchor report is gone', async () => {
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(
      preloadConfig({
        openingNetWorth: { amount: 123000, source: 'derived', anchorYearMonth: '2026-01' },
      }) as never,
    );
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([]);
    vi.mocked(getProjectionOpeningUseCase.execute).mockResolvedValue({
      openingNetWorth: 380_000,
      anchorYearMonth: '2026-08',
      assets: 500_000,
      liabilities: 120_000,
    });
    renderWorkspace('/retirement/new?from=projection-1');

    const input = await openBaseline();
    await waitFor(() => expect(input).toHaveValue(380000));
    expect(screen.getByTestId('opening-net-worth-note')).toHaveTextContent('As of 2026-08');
  });

  it('drops the anchor when the anchor report and every closed month are gone', async () => {
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(
      preloadConfig({
        openingNetWorth: { amount: 123000, source: 'derived', anchorYearMonth: '2026-01' },
      }) as never,
    );
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([]);
    vi.mocked(getProjectionOpeningUseCase.execute).mockResolvedValue({
      reason: 'NO_CLOSED_PERIOD',
    });
    renderWorkspace('/retirement/new?from=projection-1');

    const input = await openBaseline();
    await waitFor(() => expect(input).toHaveValue(123000));
    expect(screen.queryByTestId('opening-net-worth-note')).not.toBeInTheDocument();
  });

  it('sends the anchor with the calculation, not just the visible note', async () => {
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(
      preloadConfig({
        openingNetWorth: { amount: 123_000, source: 'derived', anchorYearMonth: '2026-01' },
      }) as never,
    );
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([
      balanceSheetReport('2026-01', 150_000, 20_000),
    ]);
    renderWorkspace('/retirement/new?from=projection-1');

    await openBaseline();
    await addRule();
    await confirmRule('Salary');
    await calculate();

    const [request] = vi.mocked(calculateProjectionWorkflow.execute).mock.lastCall ?? [];
    expect(request?.opening).toEqual({
      source: 'derived',
      amount: 123_000,
      anchorYearMonth: '2026-01',
    });
  });

  it('falls back to a blank, dirty setup when the source projection is gone', async () => {
    vi.mocked(getProjectionViewUseCase.execute).mockResolvedValue(null);
    const router = renderWorkspace('/retirement/new?from=missing');

    expect(await screen.findByTestId('preload-warning')).toHaveTextContent(
      'Could not resolve the opening balance. Starting from a blank setup with the opening left empty.',
    );
    expect(await openBaseline()).toHaveValue(null);
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

  it('shows an error and RETRY when saving fails, then lands on the projection', async () => {
    const router = renderWorkspace();
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

    expect(await screen.findByText('projection view')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/retirement/projections/projection-1');
  });

  it('closes the dialog and lands on the projection it just saved', async () => {
    vi.mocked(persistProjectionUseCase.execute).mockResolvedValue({
      ok: true,
      id: 'projection-9',
    });
    const router = renderWorkspace();
    await fillValidSetup();
    await calculate();

    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));
    const input = await screen.findByLabelText('Projection name');
    fireEvent.change(input, { target: { value: 'First projection' } });
    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));

    expect(await screen.findByText('projection view')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/retirement/projections/projection-9');
    expect(notifySaved).toHaveBeenCalledWith('Projection saved.');
    expect(screen.queryByLabelText('Projection name')).not.toBeInTheDocument();
  });
}, 30_000);
