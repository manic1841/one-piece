import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const mockGetOverview = vi.hoisted(() => vi.fn());

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

vi.mock('@/ui/features/household/components/HouseholdSwitcher', () => ({
  default: () => <div data-testid="household-switcher" />,
}));

import DashboardPage from './DashboardPage';

describe('DashboardPage stat row', () => {
  it('renders total assets, total liabilities, and next month debt payment', async () => {
    mockGetOverview.mockResolvedValue({
      anchor: {
        yearMonth: '2026-08',
        netWorth: 450,
        assets: 600,
        liabilities: 150,
        netWorthSeries: [
          { year: 2026, month: 8, netAssets: 450 },
        ],
      },
      pulse: null,
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    const assets = await screen.findByTestId('stat-totalAssets');
    expect(assets.textContent).toContain('$600');
    expect(assets.textContent).toContain('總資產');

    expect(screen.getByTestId('stat-totalLiabilities').textContent).toContain('$150');
    expect(screen.getByTestId('stat-nextMonthDebtDue').textContent).toContain('$420');
  });
});
