import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { type AccountSnapshot } from '@/domains/account/types/account';
import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/schemas';

import { usePortfolioCashFlowStage } from './usePortfolioCashFlowStage';

vi.mock('@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase', () => ({
  listPortfolioSnapshotsUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/account/use_cases/getAccountSnapshotsUseCase', () => ({
  getAccountSnapshotsUseCase: { execute: vi.fn() },
}));

const { authIdentity } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
}));
vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));

const portfolio = (id: string): Portfolio =>
  ({
    id,
    name: `Portfolio ${id}`,
    securitiesAccountId: 'acc-securities',
    bankAccountId: 'acc-cash',
    isActive: true,
    order: 0,
  }) as Portfolio;

const snapshot = (id: string, cashFlow: { deposits: number; withdrawals: number }) =>
  ({ id, cashFlow }) as unknown as PortfolioSnapshot;

describe('usePortfolioCashFlowStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAccountSnapshotsUseCase.execute).mockResolvedValue([]);
  });

  it('reads the linked account balances and the previous month total for the opening value', async () => {
    vi.mocked(listPortfolioSnapshotsUseCase.execute).mockImplementation(async ({ year, month }) => [
      {
        totalValue: year === 2026 && month === 7 ? 1_200_000 : 0,
        cashFlow: { deposits: 0, withdrawals: 0 },
      } as PortfolioSnapshot,
    ]);
    vi.mocked(getAccountSnapshotsUseCase.execute).mockImplementation(async ({ month }) =>
      month === 8 ? [{ amount: 1_000_000 } as AccountSnapshot] : [],
    );

    const { result } = renderHook(() =>
      usePortfolioCashFlowStage({
        householdId: 'household-1',
        selectedYearMonth: '2026-08',
        portfolios: [portfolio('p-1')],
        confirmingStageId: null,
      }),
    );

    await waitFor(() => expect(result.current.balances['p-1']).toBeDefined());
    expect(result.current.balances['p-1']).toEqual({ securities: 1_000_000, bank: 1_000_000 });
    expect(result.current.openingValues['p-1']).toBe(1_200_000);
  });

  it('falls back to the previous month and reports null when neither month has a balance', async () => {
    vi.mocked(listPortfolioSnapshotsUseCase.execute).mockResolvedValue([]);
    vi.mocked(getAccountSnapshotsUseCase.execute).mockImplementation(async ({ month }) =>
      month === 7 ? [{ amount: 900_000 } as AccountSnapshot] : [],
    );

    const { result } = renderHook(() =>
      usePortfolioCashFlowStage({
        householdId: 'household-1',
        selectedYearMonth: '2026-08',
        portfolios: [portfolio('p-1')],
        confirmingStageId: null,
      }),
    );

    await waitFor(() => expect(result.current.balances['p-1']).toBeDefined());
    expect(result.current.balances['p-1']).toEqual({ securities: 900_000, bank: 900_000 });
    expect(result.current.openingValues['p-1']).toBe(0);

    vi.mocked(getAccountSnapshotsUseCase.execute).mockResolvedValue([]);
    await act(async () => {
      await result.current.refresh?.();
    });
    expect(result.current.balances['p-1']).toEqual({ securities: null, bank: null });
  });

  it('seeds the draft from the month snapshots once all are loaded', async () => {
    vi.mocked(listPortfolioSnapshotsUseCase.execute).mockResolvedValue([
      snapshot('s-1', { deposits: 1_000, withdrawals: 200 }),
    ]);
    const portfolios = [portfolio('p-1')];
    const { result } = renderHook(() =>
      usePortfolioCashFlowStage({
        householdId: 'household-1',
        selectedYearMonth: '2026-08',
        portfolios,
        confirmingStageId: null,
      }),
    );
    await waitFor(() =>
      expect(result.current.cashFlows).toEqual({ 'p-1': { deposits: 1_000, withdrawals: 200 } }),
    );
    expect(result.current.buildRequest()).toEqual({
      stageId: 'PORTFOLIO_CASH_FLOW',
      portfolioCashFlows: { 'p-1': { deposits: 1_000, withdrawals: 200 } },
    });
  });

  it('does not seed when a snapshot is missing', async () => {
    vi.mocked(listPortfolioSnapshotsUseCase.execute).mockResolvedValue([]);
    const portfolios = [portfolio('p-1')];
    const { result } = renderHook(() =>
      usePortfolioCashFlowStage({
        householdId: 'household-1',
        selectedYearMonth: '2026-08',
        portfolios,
        confirmingStageId: null,
      }),
    );
    await waitFor(() => expect(result.current.portfolioSnapshots.size).toBe(1));
    expect(result.current.portfolioSnapshots.get('p-1')).toBeNull();
    expect(result.current.cashFlows).toBeNull();
  });

  it('seeds once per month and never overwrites later edits', async () => {
    vi.mocked(listPortfolioSnapshotsUseCase.execute).mockResolvedValue([
      snapshot('s-1', { deposits: 700, withdrawals: 0 }),
    ]);
    const portfolios = [portfolio('p-1')];
    const renderFor = (month: string) =>
      renderHook(() =>
        usePortfolioCashFlowStage({
          householdId: 'household-1',
          selectedYearMonth: month,
          portfolios,
          confirmingStageId: null,
        }),
      );

    const august = renderFor('2026-08');
    await waitFor(() => expect(august.result.current.cashFlows['p-1']).toBeDefined());
    act(() => {
      august.result.current.setCashFlows({ 'p-1': { deposits: 9_999, withdrawals: 0 } });
    });
    // #235: a same-month reload goes through the stage's own `refresh`, which is
    // the single reload entry the page broadcasts — not a prop-driven counter.
    await act(async () => {
      await august.result.current.refresh?.();
    });
    await waitFor(() => expect(august.result.current.portfolioSnapshots.get('p-1')).not.toBeNull());
    expect(august.result.current.cashFlows['p-1'].deposits).toBe(9_999);

    // A new month is a new mount, so the owned draft cannot survive it.
    august.unmount();
    const { result } = renderFor('2026-09');

    await waitFor(() => expect(result.current.cashFlows['p-1'].deposits).toBe(700));
  });

  // #231: a failed prefill load used to leave an empty draft that read as a
  // clean month. The hook reports it with copy the consumer owns; the failure
  // never leaks a rejection, and a draft the user types by hand still submits
  // (prefill is a convenience, not a gate).
  it('reports a load failure without blocking a hand-typed draft or leaking a rejection', async () => {
    vi.mocked(listPortfolioSnapshotsUseCase.execute).mockRejectedValue(new Error('boom'));
    // Hoisted: a fresh array per render would change `load`'s identity and loop.
    const portfolios = [portfolio('p-1')];

    const { result } = renderHook(() =>
      usePortfolioCashFlowStage({
        householdId: 'household-1',
        selectedYearMonth: '2026-08',
        portfolios,
        confirmingStageId: null,
      }),
    );

    await waitFor(() =>
      expect(result.current.errorMessage).toBe('無法載入 Portfolio 金流，請稍後再試。'),
    );
    expect(result.current.cashFlows).toBeNull();

    act(() => {
      result.current.setCashFlows({ 'p-1': { deposits: 5_000, withdrawals: 0 } });
    });
    expect(result.current.buildRequest()).toEqual({
      stageId: 'PORTFOLIO_CASH_FLOW',
      portfolioCashFlows: { 'p-1': { deposits: 5_000, withdrawals: 0 } },
    });

    // The failed load settles instead of escaping as an unhandled rejection.
    await act(async () => {
      await expect(result.current.refresh?.()).resolves.toBeUndefined();
    });
  });
});
