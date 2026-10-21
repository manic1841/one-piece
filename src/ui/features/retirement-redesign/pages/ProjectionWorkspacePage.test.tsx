import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { getStartingNetWorthUseCase } from '@/application/retirement/use_cases/getStartingNetWorthUseCase';
import { type RetirementPlanWorkspaceData } from '@/application/retirement/use_cases/retirementPlanLookup';

import ProjectionWorkspacePage from './ProjectionWorkspacePage';

vi.mock('@/application/retirement/use_cases/getStartingNetWorthUseCase', () => ({
  getStartingNetWorthUseCase: { execute: vi.fn() },
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

vi.mock('@/ui/features/retirement-redesign/hooks/usePlanLibrary', () => ({
  usePlanLibrary: () => planLibraryMock,
}));

const planFixture: RetirementPlanWorkspaceData = {
  id: 'plan-1',
  name: 'Early retirement',
  assumptions: {
    birthYear: 1970,
    retirementAge: 55,
    lifeExpectancy: 90,
    inflationRate: 0.02,
    annualReturnRate: 0.05,
  },
  rules: [],
  lifeEvents: [],
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
    vi.mocked(getStartingNetWorthUseCase.execute).mockResolvedValue({
      reason: 'NO_CLOSED_PERIOD',
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

  it('keeps the route when switching to preview and makes the inputs read-only', async () => {
    const router = renderWorkspace();
    fireEvent.change(await screen.findByLabelText('Retirement age'), {
      target: { value: '65' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'PREVIEW' }));

    expect(screen.getByText(/Preview is read-only/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SAVE' })).toBeDisabled();
    expect(screen.getByLabelText('Opening net worth')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Retirement age')).toHaveAttribute('readonly');
    expect(router.state.location.pathname).toBe('/retirement/new');

    fireEvent.click(screen.getByRole('button', { name: 'BACK TO SETUP' }));

    expect(screen.getByRole('button', { name: 'PREVIEW' })).toBeInTheDocument();
    expect(screen.queryByText(/Preview is read-only/)).not.toBeInTheDocument();
  });

  it('shows inline schema labels for invalid assumptions', async () => {
    renderWorkspace();

    fireEvent.change(await screen.findByLabelText('Retirement age'), {
      target: { value: '65.5' },
    });
    fireEvent.change(await screen.findByLabelText('Life expectancy'), {
      target: { value: '200' },
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

    await addRule();
    fireEvent.click(await screen.findByRole('button', { name: 'PREVIEW' }));
    expect(screen.getByText(/Preview is read-only/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'APPLY PLAN' }));
    fireEvent.click(await screen.findByRole('button', { name: 'APPLY' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'PREVIEW' })).toBeInTheDocument(),
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
});
