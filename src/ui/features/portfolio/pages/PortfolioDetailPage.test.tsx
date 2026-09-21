import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { type Portfolio } from '@/domains/portfolio/types/portfolio';
import { useAuth } from '@/infra/contexts/useAuth';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';
import { usePortfolioCmds } from '@/ui/features/portfolio/hooks/usePortfolioCmds';
import {
  usePortfolioQueries,
  usePortfolios,
} from '@/ui/features/portfolio/hooks/usePortfolios';

vi.mock('@/infra/contexts/useAuth');
vi.mock('@/ui/hooks/useAuthContext');
vi.mock('@/ui/features/account/hooks/useAccounts');
vi.mock('@/ui/features/portfolio/hooks/usePortfolioCmds');
vi.mock('@/ui/features/portfolio/hooks/usePortfolios');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useParams: vi.fn(() => ({ id: 'p1' })),
  };
});

const mockUseAuth = vi.mocked(useAuth);
const mockUseNavigate = vi.mocked(useNavigate);
const mockUsePortfolios = vi.mocked(usePortfolios);
const mockUsePortfolioQueries = vi.mocked(usePortfolioQueries);
const mockUsePortfolioCmds = vi.mocked(usePortfolioCmds);
const mockUseAccounts = vi.mocked(useAccounts);

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);

import PortfolioDetailPage from './PortfolioDetailPage';

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
  id: 'p1-2026-09',
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

const renderPage = (overrides: { updatePortfolio?: ReturnType<typeof vi.fn> } = {}) => {
  mockUseAuth.mockReturnValue({
    userProfile: {
      uid: 'u1',
      email: 'user@example.com',
      householdId: 'h1',
    },
  } as never);
  mockUsePortfolios.mockReturnValue({
    portfolios: [portfolio],
    latestSnapshots: new Map([['p1', snapshot as never]]),
    toListItemVM: vi.fn(),
    loading: false,
    error: null,
    reload: vi.fn(),
  } as never);
  mockUsePortfolioQueries.mockReturnValue({
    getSnapshots: vi.fn().mockResolvedValue([snapshot]),
    loading: false,
    error: null,
  } as never);
  mockUsePortfolioCmds.mockReturnValue({
    createPortfolio: vi.fn(),
    updatePortfolio: overrides.updatePortfolio ?? vi.fn().mockResolvedValue(undefined),
    deletePortfolio: vi.fn(),
    reorderPortfolios: vi.fn(),
    createSnapshot: vi.fn(),
    deleteSnapshot: vi.fn(),
    loading: false,
    error: null,
  } as never);
  mockUseAccounts.mockReturnValue({
    fetchAccounts: vi.fn().mockResolvedValue([
      { id: 's1', name: 'Brokerage', category: 'securities', currency: 'TWD' },
      { id: 'b1', name: 'Investment Bank', category: 'bank', currency: 'TWD' },
    ]),
    fetchAccountsWithSnapshots: vi.fn(),
    loading: false,
    error: null,
  } as never);

  return render(
    <MemoryRouter>
      <PortfolioDetailPage />
    </MemoryRouter>,
  );
};

describe('PortfolioDetailPage header', () => {
  it('renders the shared PageHeader with title, crumb, badge and back button', async () => {
    const { container } = renderPage();

    expect(await screen.findByText('PORTFOLIO VALUE')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Main Portfolio' })).toBeInTheDocument();
    expect(screen.getByText('PORTFOLIOS')).toBeInTheDocument();
    expect(screen.getByText('2026-09')).toBeInTheDocument();

    const backButton = container.querySelector('svg.lucide-arrow-left')?.closest('button');
    expect(backButton).not.toBeNull();
  });

  it('navigates back to the portfolio list from the header back button', async () => {
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);
    const { container } = renderPage();
    await screen.findByText('PORTFOLIO VALUE');

    const backButton = container.querySelector('svg.lucide-arrow-left')?.closest('button');
    expect(backButton).not.toBeNull();
    fireEvent.click(backButton as HTMLButtonElement);

    expect(navigate).toHaveBeenCalledWith('/portfolios');
  });

  it('exposes the inline name editor in the header title slot', async () => {
    renderPage();
    await screen.findByText('PORTFOLIO VALUE');

    expect(screen.getByRole('button', { name: 'Edit name' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));

    const input = screen.getByLabelText('Rename') as HTMLInputElement;
    expect(input.value).toBe('Main Portfolio');
  });

  it('submits the rename through the update portfolio command', async () => {
    const updatePortfolio = vi.fn().mockResolvedValue(undefined);
    renderPage({ updatePortfolio });
    await screen.findByText('PORTFOLIO VALUE');

    fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
    const input = screen.getByLabelText('Rename');
    fireEvent.change(input, { target: { value: 'Growth Fund' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(updatePortfolio).toHaveBeenCalledWith('p1', { name: 'Growth Fund' });
    });
  });
});
