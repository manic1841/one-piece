import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type RetirementPlan } from '@/domains/retirement/types';
import {
  type RetirementProjectionPointVM,
  type RetirementProjectionVM,
  type RetirementProjectionYearDetailVM,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

import RetirementPlanForm from './RetirementPlanForm';

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({
    userProfile: {
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      householdId: 'household-1',
      isGlobalAdmin: false,
    },
    logout: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/ui/features/retirement/hooks/useRetirementPlanDetailPage', () => ({
  useRetirementPlanDetailPage: () => ({
    plan: planFixture(),
    headerVM: {
      id: 'plan-1',
      name: 'Test Plan',
      retirementSummaryText: 'Retire at 60, life expectancy 85',
      autoUpdate: false,
    },
    assumptionsVM: {
      currentYear: 2026,
      birthYear: 1985,
      retirementAge: 60,
      lifeExpectancy: 85,
      inflationRate: 2,
      investmentReturnRate: 5,
    },
    incomeItems: [],
    expenseItems: [],
    eventItems: [],
    netWorthSource: {
      startingNetWorth: 100000,
      anchorYearMonth: '2025-12',
      assets: 200000,
      liabilities: 100000,
    },
    projectionVM: projectionFixture(),
    loading: false,
    error: null,
    reload: vi.fn(),
    staleIncomeSyncBanner: null,
    handleApplyStaleIncomeSync: vi.fn(),
    handleDismissStaleIncomeSync: vi.fn(),
    handleUpdatePlan: vi.fn(),
    handleToggleAutoUpdate: vi.fn(),
    handleRecalculate: vi.fn(),
    handleAddExpense: vi.fn(),
    handleUpdateExpense: vi.fn(),
    handleDeleteExpense: vi.fn(),
    handleImportDebtRepayments: vi.fn(),
    handleAddEvent: vi.fn(),
    handleUpdateEvent: vi.fn(),
    handleDeleteEvent: vi.fn(),
    handleDelete: vi.fn(),
    handleSaveName: vi.fn(),
    handleAddIncome: vi.fn(),
    handleUpdateIncome: vi.fn(),
    handleDeleteIncome: vi.fn(),
    handleImportIncomeFromTransactions: vi.fn(),
    handleImportExpensesFromLedger: vi.fn(),
  }),
}));

function planFixture(): RetirementPlan {
  return {
    id: 'plan-1',
    householdId: 'household-1',
    name: 'Test Plan',
    isActive: true,
    autoUpdate: false,
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    currentYear: 2026,
    birthYear: 1985,
    retirementAge: 60,
    lifeExpectancy: 85,
    inflationRate: 2,
    investmentReturnRate: 5,
    incomes: [],
    expenses: [],
    events: [],
  };
}

function projectionFixture(): RetirementProjectionVM {
  const point: RetirementProjectionPointVM = {
    year: 2046,
    age: 61,
    income: 120000,
    expense: 60000,
    investmentIncome: 0,
    netCashFlow: 60000,
    savings: 1000000,
    incomeText: 'NT$120,000',
    expenseText: 'NT$60,000',
    investmentIncomeText: 'NT$0',
    netCashFlowText: 'NT$60,000',
    savingsText: 'NT$1,000,000',
    isBankruptYear: false,
    isRetired: true,
  };
  const yearDetail: RetirementProjectionYearDetailVM = {
    year: 2046,
    age: 61,
    isRetired: true,
    statusText: '退休後',
    incomeText: 'NT$120,000',
    expenseText: 'NT$60,000',
    investmentReturnText: 'NT$0',
    netCashFlowText: 'NT$60,000',
    savingsText: 'NT$1,000,000',
    incomeItems: [{ name: '薪資', amountText: 'NT$120,000' }],
    expenseItems: [{ name: '生活支出', amountText: 'NT$60,000' }],
  };

  return {
    retirementYear: 2045,
    retirementSavingsText: 'NT$1,000,000',
    minYearText: '2026',
    minSavingsText: 'NT$100,000',
    bankruptText: '否',
    bankruptTone: 'positive',
    chartData: [point],
    yearlyDetails: [yearDetail],
    expenseBreakdownChartData: [{ name: '生活支出', value: 60000, type: 'fixed' }],
    risks: [
      { key: 'retirementYear', label: '退休年', valueText: '2045', tone: 'default' },
      { key: 'bankruptcyYear', label: '破產年', valueText: '無', tone: 'default' },
      { key: 'minSavingsYear', label: '最低資產年', valueText: '2026', tone: 'default' },
      { key: 'lifeExpectancyEnd', label: '預期壽命終點', valueText: '2070', tone: 'default' },
    ],
  };
}

function renderForm() {
  return render(
    <MemoryRouter>
      <RetirementPlanForm />
    </MemoryRouter>,
  );
}

function openTab(name: RegExp) {
  fireEvent.mouseDown(screen.getByRole('tab', { name }));
}

describe('RetirementPlanForm - Scenario Workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the header and the plan name', () => {
    renderForm();

    expect(screen.getByText('Test Plan')).toBeInTheDocument();
  });

  it('exposes Overview / Projection / Plan Setup tabs', () => {
    renderForm();

    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Projection' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Plan Setup' })).toBeInTheDocument();
  });

  it('puts the tab bar in a horizontal scroll container so it never stacks on a narrow screen', () => {
    renderForm();

    const tablist = screen.getByRole('tablist');
    expect(tablist.parentElement).toHaveClass('overflow-x-auto');
    expect(tablist).toHaveClass('min-w-max');
  });

  it('shows the outcome, current state, net worth and key risks on the Overview tab', () => {
    renderForm();

    expect(screen.getByText('退休時資產')).toBeVisible();
    expect(screen.getByText('是否破產')).toBeVisible();
    expect(screen.getByText('期初淨資產')).toBeVisible();
    expect(screen.getByText('KEY RISKS')).toBeVisible();
    expect(screen.getByTestId('retirement-risk-retirementYear')).toHaveTextContent('2045');
  });

  it('shows the cash flow projection and yearly details on the Projection tab', () => {
    renderForm();

    openTab(/Projection/);

    expect(screen.getByText('CASH FLOW PROJECTION')).toBeVisible();
    expect(screen.getByText(/每年明細/)).toBeVisible();
  });

  it('keeps the assumptions and income inputs off the Overview tab until Plan Setup is opened', () => {
    renderForm();

    expect(screen.queryByText('SCENARIO ASSUMPTIONS')).not.toBeInTheDocument();
    expect(screen.queryByText(/匯入上一完整年度收入/)).not.toBeInTheDocument();

    openTab(/Plan Setup/);

    expect(screen.getByText('SCENARIO ASSUMPTIONS')).toBeVisible();
    expect(screen.getByText('LIVING EXPENSES')).toBeVisible();
    expect(screen.getByText('LIFE EVENTS')).toBeVisible();
  });

  it('shows plan inflation as the growth default when the expense dialog opens', () => {
    renderForm();

    openTab(/Plan Setup/);
    fireEvent.click(screen.getByRole('button', { name: /add expense/i }));

    expect(screen.getByText('Using plan inflation: 2%')).toBeInTheDocument();
  });

  it('does not show the stale income sync banner when absent', () => {
    renderForm();

    expect(screen.queryByText(/收入樣本年度可更新/)).not.toBeInTheDocument();
  });
});
