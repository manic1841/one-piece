import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type RetirementPlan } from '@/domains/retirement/types';
import {
  type RetirementProjectionVM,
  type RetirementProjectionPointVM,
  type RetirementProjectionYearDetailVM,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

vi.mock('@/infra/contexts/useAuth', () => ({
  useAuth: () => ({
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
      currentSavings: 100000,
      currentSavingsText: 'NT$100,000',
      salaryGrowthRate: 3,
      inflationRate: 2,
      investmentReturnRate: 5,
    },
    incomeItems: [],
    expenseItems: [],
    eventItems: [],
    projectionVM: projectionFixture(),
    loading: false,
    error: null,
    isEditingName: false,
    editedName: '',
    setEditedName: vi.fn(),
    setIsEditingName: vi.fn(),
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
    handleCancelEditName: vi.fn(),
    handleAddIncome: vi.fn(),
    handleUpdateIncome: vi.fn(),
    handleDeleteIncome: vi.fn(),
    handleImportIncomeFromTransactions: vi.fn(),
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
    currentSavings: 100000,
    salaryGrowthRate: 3,
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
    netCashFlow: 60000,
    savings: 1000000,
    incomeText: 'NT$120,000',
    expenseText: 'NT$60,000',
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
    bankruptClassName: '',
    chartData: [point],
    yearlyDetails: [yearDetail],
    expenseBreakdownChartData: [{ name: '生活支出', value: 60000, type: 'fixed' }],
  };
}

import RetirementPlanForm from './RetirementPlanForm';

describe('RetirementPlanForm - Scenario Workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the header and the plan name', () => {
    render(
      <MemoryRouter>
        <RetirementPlanForm />
      </MemoryRouter>,
    );

    expect(screen.getByText('Test Plan')).toBeInTheDocument();
  });

  it('renders output-first sections in order: Overview, Projected Net Worth, Cash Flow Projection, then assumptions and inputs', () => {
    render(
      <MemoryRouter>
        <RetirementPlanForm />
      </MemoryRouter>,
    );

    const overviewHeading = screen.getByText(/overview \/ results/i);
    const netWorthHeading = screen.getByText(/projected net worth/i);
    const cashFlowHeading = screen.getByText(/cash flow projection/i);
    const assumptionsHeading = screen.getByText(/scenario assumptions/i);
    const incomeHeading = screen.getByText(/^income$/i);
    const expensesHeading = screen.getByText(/living expenses/i);
    const eventsHeading = screen.getByText(/life events/i);

    const orderedHeadings = [
      overviewHeading,
      netWorthHeading,
      cashFlowHeading,
      assumptionsHeading,
      incomeHeading,
      expensesHeading,
      eventsHeading,
    ];

    const positions = orderedHeadings.map((heading, index) => {
      const next = orderedHeadings[index + 1];
      if (!next) return true;
      return heading.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING;
    });

    expect(positions.every(Boolean)).toBe(true);
  });

  it('expands the Overview section by default and shows projection outputs', () => {
    render(
      <MemoryRouter>
        <RetirementPlanForm />
      </MemoryRouter>,
    );

    expect(screen.getByText('退休時資產')).toBeVisible();
    expect(screen.getByText('是否破產')).toBeVisible();
  });

  it('collapses downstream sections so assumptions inputs are hidden until expanded', () => {
    render(
      <MemoryRouter>
        <RetirementPlanForm />
      </MemoryRouter>,
    );

    expect(screen.queryByPlaceholderText(/age/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/匯入上一完整年度收入/)).not.toBeInTheDocument();
  });

  it('keeps stale income sync banner above the workspace when present', () => {
    render(
      <MemoryRouter>
        <RetirementPlanForm />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/收入樣本年度可更新/)).not.toBeInTheDocument();
  });
});
