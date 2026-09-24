import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

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

import DashboardPage from './DashboardPage';

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
    { year: 2026, month: 7, netCashFlow: 3200 },
    { year: 2026, month: 8, netCashFlow: -12300 },
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
    expect(assets.textContent).toContain('$600');
    expect(assets.textContent).toContain('總資產');
    expect(assets.textContent).toContain('ANCHORED 2026-08');

    expect(screen.getByTestId('stat-totalLiabilities').textContent).toContain('$150');
    expect(screen.getByTestId('stat-monthlyCashFlow').textContent).toContain('-$12,300');
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

    const ytd = await screen.findByTestId('hero-ytd');
    expect(ytd.textContent).toContain('+12.5% YTD');
    expect(ytd.textContent).toContain('+$50');
  });
});

describe('DashboardPage assets and liabilities block', () => {
  it('renders the balance sheet composition from the anchor', async () => {
    mockGetOverview.mockResolvedValue(buildOverview());

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    const block = await screen.findByTestId('assets-liabilities');
    expect(block.textContent).toContain('現金與銀行');
    expect(block.textContent).toContain('投資資產');
    expect(block.textContent).toContain('不動產');
    expect(block.textContent).toContain('貸款');
    expect(screen.getByTestId('al-asset-cash')).toBeInTheDocument();
    expect(screen.getByTestId('al-liability-loan')).toBeInTheDocument();
  });
});

describe('DashboardPage monthly cash flow chart', () => {
  it('renders the 12M net cash flow series with the latest value', async () => {
    mockGetOverview.mockResolvedValue(buildOverview());

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    const chart = await screen.findByTestId('cashflow-chart');
    expect(chart.textContent).toContain('AUG 2026');
    expect(chart.textContent).toContain('-$12,300');
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
    expect(card.textContent).toContain('$420');
    expect(screen.getByTestId('close-progress')).toBeInTheDocument();
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

    await screen.findByTestId('hero-ytd');

    const container = document.body;
    const order = (container.textContent ?? '')
      .split(/(NET WORTH TREND|NET WORTH|FINANCIAL SNAPSHOT|ASSETS & LIABILITIES|MONTHLY CASH FLOW|RECENT TRANSACTIONS|MONTHLY CLOSE)/)
      .filter((part) =>
        [
          'NET WORTH',
          'NET WORTH TREND',
          'FINANCIAL SNAPSHOT',
          'ASSETS & LIABILITIES',
          'MONTHLY CASH FLOW',
          'RECENT TRANSACTIONS',
          'MONTHLY CLOSE',
        ].includes(part),
      );

    expect(order).toEqual([
      'NET WORTH',
      'NET WORTH TREND',
      'FINANCIAL SNAPSHOT',
      'ASSETS & LIABILITIES',
      'MONTHLY CASH FLOW',
      'RECENT TRANSACTIONS',
      'MONTHLY CLOSE',
    ]);
  });
});
