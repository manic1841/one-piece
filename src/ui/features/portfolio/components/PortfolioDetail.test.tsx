import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type Portfolio } from '@/domains/portfolio/types/portfolio';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';
import { usePortfolioCmds } from '@/ui/features/portfolio/hooks/usePortfolioCmds';
import {
  usePortfolioQueries,
  usePortfolios,
} from '@/ui/features/portfolio/hooks/usePortfolios';

vi.mock('@/ui/features/account/hooks/useAccounts');
vi.mock('@/ui/hooks/useAuthIdentity');
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

const mockUsePortfolios = vi.mocked(usePortfolios);
const mockUsePortfolioQueries = vi.mocked(usePortfolioQueries);
const mockUsePortfolioCmds = vi.mocked(usePortfolioCmds);
const mockUseAccounts = vi.mocked(useAccounts);

import PortfolioDetail from './PortfolioDetail';

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

const renderDetail = () => {
  mockUsePortfolios.mockReturnValue({
    portfolios: [portfolio],
    latestSnapshots: new Map(),
    toListItemVM: vi.fn(),
    toDetailVM: vi.fn(),
    loading: false,
    error: null,
    reload: vi.fn(),
  } as never);
  mockUsePortfolioQueries.mockReturnValue({
    getSnapshots: vi.fn().mockResolvedValue({ ok: true, value: [snapshot] }),
    loading: false,
    error: null,
  } as never);
  mockUsePortfolioCmds.mockReturnValue({
    createPortfolio: vi.fn(),
    updatePortfolio: vi.fn(),
    deletePortfolio: vi.fn(),
    reorderPortfolios: vi.fn(),
    createSnapshot: vi.fn(),
    deleteSnapshot: vi.fn(),
    loading: false,
    error: null,
    errorMessage: null,
  } as never);
  mockUseAccounts.mockReturnValue({
    fetchAccounts: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    fetchAccountsWithSnapshots: vi.fn(),
    loading: false,
    error: null,
    errorMessage: null,
  } as never);

  return render(<PortfolioDetail householdId="h1" portfolio={portfolio} />);
};

describe('PortfolioDetail surfaces', () => {
  it('renders the six performance sections without a snapshot create or delete entry', async () => {
    renderDetail();

    expect(await screen.findByText('PORTFOLIO VALUE')).toBeInTheDocument();
    expect(screen.getByText('VALUE BREAKDOWN')).toBeInTheDocument();
    expect(screen.getByText('RETURN')).toBeInTheDocument();
    expect(screen.getByText('12M PORTFOLIO VALUE')).toBeInTheDocument();
    expect(screen.getByText('MONTHLY PERFORMANCE')).toBeInTheDocument();
    expect(screen.getByText('RETURN CALCULATION')).toBeInTheDocument();

    expect(screen.queryByText(/關帳快照/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /刪除快照/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Record Settlement/i })).not.toBeInTheDocument();
  });

  it('keeps the monthly performance table rows', async () => {
    renderDetail();

    expect(await screen.findByText('MONTHLY PERFORMANCE')).toBeInTheDocument();
    expect(screen.getAllByText(/SEP\s+2026/).length).toBeGreaterThan(0);
  });
});
