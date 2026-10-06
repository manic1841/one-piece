import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import DashboardPage from './DashboardPage';

const mockGetOverview = vi.hoisted(() => vi.fn());

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

vi.mock('@/application/dashboard/use_cases/getDashboardOverviewUseCase', () => ({
  getDashboardOverviewUseCase: {
    execute: mockGetOverview,
  },
}));

vi.mock('@/application/monthly_close/use_cases/financialPeriodAccessUseCases', () => ({
  GetFinancialPeriodUseCase: vi.fn(function () {
    return { execute: vi.fn().mockResolvedValue(null) };
  }),
}));

vi.mock('@/application/ledger/use_cases/listRecentTransactionsUseCase', () => ({
  listRecentTransactionsUseCase: {
    execute: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/application/debt/use_cases/getNextMonthDebtDueUseCase', () => ({
  getNextMonthDebtDueUseCase: {
    execute: vi.fn().mockResolvedValue({ total: 420, yearMonth: '2026-10' }),
  },
}));

vi.mock('@/ui/features/app/layout/HouseholdSwitcher', () => ({
  default: () => <div data-testid="household-switcher" />,
}));

const buildOverview = () => ({
  anchor: {
    yearMonth: '2026-08',
    netWorth: 450,
    assets: 600,
    liabilities: 150,
    composition: {
      assets: [
        { key: 'cash', label: '現金與銀行', amount: 400 },
        { key: 'investment', label: '投資資產', amount: 200 },
        { key: 'property', label: '不動產', amount: 0 },
      ],
      liabilities: [{ key: 'loan', label: '貸款', amount: 150 }],
    },
    ytdBaseline: { yearMonth: '2026-01', netWorth: 400 },
    netWorthSeries: [{ year: 2026, month: 8, netAssets: 450 }],
  },
  pulse: {
    netCashFlow: -12300,
    investmentReturn: 3.913,
    investmentLeverage: 1.2,
    monthlyDebtPayment: 13500,
    investmentGain: 3000,
  },
  cashFlowSeries: [
    { year: 2026, month: 7, netCashFlow: 3200, cashIn: 5200, cashOut: 2000 },
    { year: 2026, month: 8, netCashFlow: -12300, cashIn: 4600, cashOut: 16900 },
  ],
});

describe('DashboardPage financial snapshot row', () => {
  it('renders five tiles with anchor and pulse values', async () => {
    mockGetOverview.mockResolvedValue(buildOverview());

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    const assets = await screen.findByTestId('stat-totalAssets');
    expect(assets.textContent).toContain('NT$600');
    expect(assets.textContent).toContain('總資產');
    expect(assets.textContent).toContain('ANCHORED 2026-08');

    expect(screen.getByTestId('stat-totalLiabilities').textContent).toContain('NT$150');
    expect(screen.getByTestId('stat-monthlyCashFlow').textContent).toContain('-NT$12,300');
    expect(screen.getByTestId('stat-portfolioReturn').textContent).toContain('3.91%');
    expect(screen.getByTestId('stat-investmentLeverage').textContent).toContain('1.20x');
  });
});

describe('DashboardPage NET WORTH hero ytd line', () => {
  it('renders signed percentage with YTD suffix and signed amount', async () => {
    mockGetOverview.mockResolvedValue(buildOverview());

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    const change = await screen.findByText(/\+12\.5% YTD/);
    expect(change.textContent).toContain('+12.5% YTD');
    expect(change.textContent).toContain('+NT$50');
  });
});

describe('DashboardPage asset composition block', () => {
  it('renders the asset composition from the anchor', async () => {
    mockGetOverview.mockResolvedValue(buildOverview());

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    const block = await screen.findByTestId('asset-composition');
    expect(block.textContent).toContain('現金與銀行');
    expect(block.textContent).toContain('投資資產');
    expect(block.textContent).toContain('不動產');
  });
});

describe('DashboardPage monthly cash flow chart', () => {
  it('renders the monthly inflow / outflow bars with the latest net value', async () => {
    mockGetOverview.mockResolvedValue(buildOverview());

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    const chart = await screen.findByTestId('cashflow-chart');
    expect(chart.textContent).toContain('AUG 2026');
    expect(chart.textContent).toContain('現金流入');
    expect(chart.textContent).toContain('現金流出');
    expect(chart.textContent).toContain('-NT$12,300');
  });
});

describe('DashboardPage monthly close card', () => {
  it('renders next month due as the what-to-pay-next landing point', async () => {
    mockGetOverview.mockResolvedValue(buildOverview());

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    const card = await screen.findByTestId('monthly-close-card');
    expect(card.textContent).toContain('下月應付');
    expect(card.textContent).toContain('NT$420');
    expect(screen.getByRole('progressbar', { name: /close stages completed/ })).toBeInTheDocument();
  });
});

describe('DashboardPage reading path order', () => {
  it('renders sections in the converged spec order', async () => {
    mockGetOverview.mockResolvedValue(buildOverview());

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await screen.findByTestId('stat-totalAssets');

    const container = document.body;
    const order = (container.textContent ?? '')
      .split(
        /(NET WORTH TREND|NET WORTH|FINANCIAL SNAPSHOT|ASSETS|MONTHLY CASH FLOW|RECENT TRANSACTIONS|MONTHLY CLOSE)/,
      )
      .filter((part) =>
        [
          'NET WORTH',
          'NET WORTH TREND',
          'FINANCIAL SNAPSHOT',
          'ASSETS',
          'MONTHLY CASH FLOW',
          'RECENT TRANSACTIONS',
          'MONTHLY CLOSE',
        ].includes(part),
      );

    expect(order).toEqual([
      'NET WORTH',
      'NET WORTH TREND',
      'FINANCIAL SNAPSHOT',
      'ASSETS',
      'MONTHLY CASH FLOW',
      'MONTHLY CLOSE',
      'RECENT TRANSACTIONS',
    ]);
  });
});
