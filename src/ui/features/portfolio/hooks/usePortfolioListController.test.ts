import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PORTFOLIO_PAGE_LABELS } from '@/ui/constants/portfolio/labels';

import { usePortfolioListController } from './usePortfolioListController';

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: () => ({
    userProfile: { uid: 'u1', email: 'u@example.com', displayName: 'Test', householdId: 'h1' },
  }),
}));

const state = vi.hoisted(() => ({
  portfolios: [] as Array<Record<string, unknown>>,
  latestSnapshots: new Map<string, unknown>(),
  errorMessage: null as string | null,
  reload: vi.fn(),
}));

const fetchAccounts = vi.fn();

const { createPortfolio, reorderPortfolios } = vi.hoisted(() => ({
  createPortfolio: vi.fn().mockResolvedValue({ ok: true, value: 'p-new' }),
  reorderPortfolios: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
}));

vi.mock('@/ui/features/portfolio/hooks/usePortfolios', () => ({
  usePortfolios: () => ({
    portfolios: state.portfolios,
    latestSnapshots: state.latestSnapshots,
    loading: false,
    error: state.errorMessage,
    errorMessage: state.errorMessage,
    reload: state.reload,
  }),
}));

vi.mock('@/ui/features/account/hooks/useAccounts', () => ({
  useAccounts: () => ({
    fetchAccounts,
    fetchAccountsWithSnapshots: vi.fn(),
    loading: false,
    error: null,
    errorMessage: null,
  }),
}));

vi.mock('@/ui/features/portfolio/hooks/usePortfolioCmds', () => ({
  usePortfolioCmds: () => ({ createPortfolio, reorderPortfolios, loading: false, error: null }),
}));

const portfolio = (id: string, name: string, order: number) => ({
  id,
  name,
  securitiesAccountId: 's1',
  bankAccountId: 'b1',
  isActive: true,
  order,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
});

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

const primeAccounts = (): void => {
  fetchAccounts.mockImplementation(
    async (
      _householdId: string,
      _auth: unknown,
      options?: { writeBack?: (accounts: unknown[]) => void },
    ) => {
      const accounts = [
        { id: 's1', name: 'Brokerage', category: 'securities', currency: 'TWD' },
        { id: 'b1', name: 'Bank', category: 'bank', currency: 'TWD' },
      ];
      options?.writeBack?.(accounts);
      return { ok: true, value: accounts };
    },
  );
};

describe('usePortfolioListController', () => {
  it('sorts rows by order and labels the linked accounts', async () => {
    primeAccounts();
    state.portfolios = [portfolio('p2', 'Second', 1), portfolio('p1', 'Main', 0)];
    state.latestSnapshots = new Map([['p1', snapshot]]);
    state.errorMessage = null;

    const { result } = renderHook(() => usePortfolioListController());

    await waitFor(() => expect(result.current.rows).toHaveLength(2));

    expect(result.current.rows.map((row) => row.id)).toEqual(['p1', 'p2']);
    expect(result.current.rows[0]?.securitiesName).toBe('Brokerage');
    expect(result.current.rows[0]?.bankName).toBe('Bank');
    expect(result.current.overview.totalValueText).toContain('2,480,000');
  });

  it('reorderRows persists the new order then reloads', async () => {
    primeAccounts();
    state.portfolios = [portfolio('p1', 'Main', 0), portfolio('p2', 'Second', 1)];
    state.latestSnapshots = new Map();

    const { result } = renderHook(() => usePortfolioListController());
    await waitFor(() => expect(result.current.rows).toHaveLength(2));

    const [first, second] = result.current.rows;
    await act(async () => {
      result.current.reorderRows([second!, first!]);
    });

    expect(reorderPortfolios).toHaveBeenCalledWith([
      { id: 'p2', order: 0 },
      { id: 'p1', order: 1 },
    ]);
    expect(state.reload).toHaveBeenCalled();
  });

  it('maps a failure value to the shared load-error copy', async () => {
    primeAccounts();
    state.portfolios = [];
    state.latestSnapshots = new Map();
    state.errorMessage = 'boom';

    const { result } = renderHook(() => usePortfolioListController());

    expect(result.current.error).toBe(PORTFOLIO_PAGE_LABELS.LOAD_ERROR);
  });
});
