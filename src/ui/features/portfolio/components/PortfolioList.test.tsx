import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { type Portfolio } from '@/domains/portfolio/types/portfolio';
import { usePortfolios } from '@/ui/features/portfolio/hooks/usePortfolios';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';

vi.mock('@/ui/features/portfolio/hooks/usePortfolios');
vi.mock('@/ui/features/account/hooks/useAccounts');

const mockUsePortfolios = vi.mocked(usePortfolios);
const mockUseAccounts = vi.mocked(useAccounts);

import PortfolioList from './PortfolioList';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

const mockUseNavigate = vi.mocked(useNavigate);

const portfolio: Portfolio = {
  id: 'p1',
  name: 'Main Portfolio',
  securitiesAccountId: 's1',
  bankAccountId: 'b1',
  isActive: true,
  order: 0,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const snapshot = {
  id: 's1-p1',
  year: 2026,
  month: 9,
  totalValue: 2480000,
  accounts: [],
  cashFlow: { deposits: 0, withdrawals: 0 },
  performance: {
    openingValue: 2220000,
    closingValue: 2480000,
    netCashFlow: 0,
    gain: 260000,
    returnRate: 12.42,
    cumulativeGain: 260000,
    cumulativeReturnRate: 12.42,
  },
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-09-01'),
  updatedAt: new Date('2026-09-01'),
};

const controllerBase = {
  portfolios: [portfolio],
  latestSnapshots: new Map([['p1', snapshot as never]]),
  toListItemVM: (p: Portfolio) => ({
    id: p.id,
    name: p.name,
    totalValue: snapshot.totalValue,
    accountCount: 2,
    isActive: p.isActive,
    order: p.order,
  }),
  loading: false,
  error: null,
  reload: vi.fn(),
};

describe('PortfolioList table', () => {
  it('renders Name | Securities | Bank | Portfolio Value | Return columns', async () => {
    mockUsePortfolios.mockReturnValue(controllerBase);
    mockUseAccounts.mockReturnValue({
      fetchAccounts: vi.fn().mockResolvedValue([
        { id: 's1', name: 'Brokerage', category: 'securities', currency: 'TWD' },
        { id: 'b1', name: 'Investment Bank', category: 'bank', currency: 'TWD' },
      ]),
      fetchAccountsWithSnapshots: vi.fn(),
      loading: false,
      error: null,
    });
    mockUseNavigate.mockReturnValue(vi.fn());

    render(
      <MemoryRouter>
        <PortfolioList householdId="h1" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Securities')).toBeInTheDocument();
    expect(screen.getByText('Bank')).toBeInTheDocument();
    expect(screen.getByText('Portfolio Value')).toBeInTheDocument();
    expect(screen.getByText('Return')).toBeInTheDocument();
    expect(screen.getAllByText('Main Portfolio').length).toBe(2);
    expect(await screen.findByText('Brokerage')).toBeInTheDocument();
    expect(await screen.findByText('Investment Bank')).toBeInTheDocument();
  });

  it('navigates to the portfolio detail page on row click', () => {
    mockUsePortfolios.mockReturnValue(controllerBase);
    mockUseAccounts.mockReturnValue({
      fetchAccounts: vi.fn().mockResolvedValue([]),
      fetchAccountsWithSnapshots: vi.fn(),
      loading: false,
      error: null,
    });
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <PortfolioList householdId="h1" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('portfolio-row-p1'));
    expect(navigate).toHaveBeenCalledWith('/portfolios/p1');
  });

  it('renders mobile compact rows with name + value + return and account metadata', async () => {
    mockUsePortfolios.mockReturnValue(controllerBase);
    mockUseAccounts.mockReturnValue({
      fetchAccounts: vi.fn().mockResolvedValue([
        { id: 's1', name: 'Brokerage', category: 'securities', currency: 'TWD' },
        { id: 'b1', name: 'Investment Bank', category: 'bank', currency: 'TWD' },
      ]),
      fetchAccountsWithSnapshots: vi.fn(),
      loading: false,
      error: null,
    });
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <PortfolioList householdId="h1" />
      </MemoryRouter>,
    );

    const compactRow = await screen.findByTestId('portfolio-row-mobile-p1');
    expect(compactRow.className).toContain('md:hidden');
    expect(compactRow.textContent).toContain('Main Portfolio');
    expect(compactRow.textContent).toContain('2,480,000');
    expect(compactRow.textContent).toContain('12.4%');
    expect(await screen.findByText('Brokerage')).toBeInTheDocument();
    expect(await screen.findByText('Investment Bank')).toBeInTheDocument();

    fireEvent.click(compactRow);
    expect(navigate).toHaveBeenCalledWith('/portfolios/p1');
  });

  it('keeps the desktop table hidden on mobile with no overflow-x-auto', () => {
    mockUsePortfolios.mockReturnValue(controllerBase);
    mockUseAccounts.mockReturnValue({
      fetchAccounts: vi.fn().mockResolvedValue([]),
      fetchAccountsWithSnapshots: vi.fn(),
      loading: false,
      error: null,
    });
    mockUseNavigate.mockReturnValue(vi.fn());

    const { container } = render(
      <MemoryRouter>
        <PortfolioList householdId="h1" />
      </MemoryRouter>,
    );

    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(table!.className).toContain('hidden');
    expect(table!.className).toContain('md:table');
    expect(container.querySelector('.overflow-x-auto')).toBeNull();
  });
});
