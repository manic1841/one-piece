import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Portfolio } from '@/domains/portfolio/types/portfolio';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';
import { usePortfolioCmds } from '@/ui/features/portfolio/hooks/usePortfolioCmds';
import { usePortfolios } from '@/ui/features/portfolio/hooks/usePortfolios';

import PortfolioList from './PortfolioList';

vi.mock('@/ui/features/portfolio/hooks/usePortfolios');
vi.mock('@/ui/features/account/hooks/useAccounts');
vi.mock('@/ui/features/portfolio/hooks/usePortfolioCmds');

const mockUsePortfolios = vi.mocked(usePortfolios);
const mockUseAccounts = vi.mocked(useAccounts);
const mockUsePortfolioCmds = vi.mocked(usePortfolioCmds);

const cmdsBase = {
  loading: false,
  error: null,
  createPortfolio: vi.fn(),
  updatePortfolio: vi.fn(),
  deletePortfolio: vi.fn(),
  reorderPortfolios: vi.fn().mockResolvedValue(undefined),
  createSnapshot: vi.fn(),
  deleteSnapshot: vi.fn(),
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

const mockUseNavigate = vi.mocked(useNavigate);

const makePortfolio = (id: string, name: string, order: number): Portfolio => ({
  id,
  name,
  securitiesAccountId: `s-${id}`,
  bankAccountId: `b-${id}`,
  isActive: true,
  order,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
});

const portfolioA = makePortfolio('p1', 'Main Portfolio', 0);
const portfolioB = makePortfolio('p2', 'Second Portfolio', 1);

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

const makeController = (portfolios: Portfolio[]) => ({
  portfolios,
  latestSnapshots: new Map([['p1', snapshot as never]]),
  loading: false,
  error: null,
  reload: vi.fn(),
});

const setup = (portfolios: Portfolio[], navigate = vi.fn()) => {
  mockUsePortfolios.mockReturnValue(makeController(portfolios));
  mockUsePortfolioCmds.mockReturnValue(cmdsBase as never);
  mockUseAccounts.mockReturnValue({
    fetchAccounts: vi.fn().mockResolvedValue({
      ok: true,
      value: [
        { id: 's-p1', name: 'Brokerage A', category: 'securities', currency: 'TWD' },
        { id: 'b-p1', name: 'Bank A', category: 'bank', currency: 'TWD' },
        { id: 's-p2', name: 'Brokerage B', category: 'securities', currency: 'TWD' },
        { id: 'b-p2', name: 'Bank B', category: 'bank', currency: 'TWD' },
      ],
    }),
    fetchAccountsWithSnapshots: vi.fn(),
    loading: false,
    error: null,
  });
  mockUseNavigate.mockReturnValue(navigate);

  const utils = render(
    <MemoryRouter>
      <PortfolioList householdId="h1" />
    </MemoryRouter>,
  );

  return { ...utils, navigate };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('PortfolioList', () => {
  it('renders Name | Securities | Bank | Portfolio Value | Return columns', async () => {
    setup([portfolioA, portfolioB]);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Securities')).toBeInTheDocument();
    expect(screen.getByText('Bank')).toBeInTheDocument();
    expect(screen.getByText('Portfolio Value')).toBeInTheDocument();
    expect(screen.getByText('Return')).toBeInTheDocument();
    expect(screen.getAllByText('Main Portfolio').length).toBe(2);
    expect(await screen.findByText('Brokerage A')).toBeInTheDocument();
  });

  it('renders a grip handle on every row (desktop and mobile)', async () => {
    setup([portfolioA, portfolioB]);

    const desktopGrips = await screen.findAllByTestId('portfolio-grip-p1');
    expect(desktopGrips.length).toBe(2);

    for (const grip of desktopGrips) {
      expect(grip.getAttribute('aria-label')).toContain('Main Portfolio');
      expect(grip.tagName).toBe('BUTTON');
    }
  });

  it('navigates to detail on row click while the grip is present', async () => {
    const navigate = vi.fn();
    setup([portfolioA, portfolioB], navigate);

    fireEvent.click(screen.getByTestId('portfolio-row-p1'));
    expect(navigate).toHaveBeenCalledWith('/portfolios/p1');

    navigate.mockClear();
    fireEvent.click(await screen.findByTestId('portfolio-row-mobile-p1'));
    expect(navigate).toHaveBeenCalledWith('/portfolios/p1');
  });

  it('does not navigate when the grip handle itself is clicked', async () => {
    const navigate = vi.fn();
    setup([portfolioA, portfolioB], navigate);

    const grip = (await screen.findAllByTestId('portfolio-grip-p1'))[0];
    fireEvent.click(grip);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('persists the new order through the reorder use case after a keyboard drag', async () => {
    const reload = vi.fn();
    mockUsePortfolios.mockReturnValue({
      portfolios: [portfolioA, portfolioB],
      latestSnapshots: new Map([['p1', snapshot as never]]),
      loading: false,
      error: null,
      reload,
    });
    mockUseAccounts.mockReturnValue({
      fetchAccounts: vi.fn().mockResolvedValue({ ok: true, value: [] }),
      fetchAccountsWithSnapshots: vi.fn(),
      loading: false,
      error: null,
      errorMessage: null,
    });
    mockUsePortfolioCmds.mockReturnValue(cmdsBase as never);
    mockUseNavigate.mockReturnValue(vi.fn());

    render(
      <MemoryRouter>
        <PortfolioList householdId="h1" />
      </MemoryRouter>,
    );

    // jsdom reports zero rects; give the two desktop rows real geometry so
    // dnd-kit collision detection can resolve a drop target.
    const rowA = screen.getByTestId('portfolio-row-p1');
    const rowB = screen.getByTestId('portfolio-row-p2');
    vi.spyOn(rowA, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 48,
      right: 400,
      width: 400,
      height: 48,
      toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(rowB, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 48,
      top: 48,
      left: 0,
      bottom: 96,
      right: 400,
      width: 400,
      height: 48,
      toJSON: () => ({}),
    } as DOMRect);

    const grip = screen.getAllByTestId('portfolio-grip-p1')[0];
    fireEvent.keyDown(grip, { key: ' ', code: 'Space' });

    // KeyboardSensor attaches its document keydown listener in a setTimeout.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    fireEvent.keyDown(document, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(document, { key: ' ', code: 'Space' });

    await waitFor(() => {
      expect(cmdsBase.reorderPortfolios).toHaveBeenCalledWith([
        { id: 'p2', order: 0 },
        { id: 'p1', order: 1 },
      ]);
    });
    expect(reload).toHaveBeenCalled();
  });
});
