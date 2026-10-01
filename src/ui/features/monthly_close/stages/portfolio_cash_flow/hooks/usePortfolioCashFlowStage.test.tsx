import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/schemas';

import { usePortfolioCashFlowStage } from './usePortfolioCashFlowStage';

vi.mock('@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase', () => ({
  listPortfolioSnapshotsUseCase: { execute: vi.fn() },
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
    const { result, rerender } = renderHook(
      ({ month }: { month: string }) =>
        usePortfolioCashFlowStage({
          householdId: 'household-1',
          selectedYearMonth: month,
          portfolios,
          confirmingStageId: null,
        }),
      { initialProps: { month: '2026-08' } },
    );
    await waitFor(() => expect(result.current.cashFlows['p-1']).toBeDefined());
    act(() => {
      result.current.setCashFlows({ 'p-1': { deposits: 9_999, withdrawals: 0 } });
    });
    // #235: a same-month reload goes through the stage's own `refresh`, which is
    // the single reload entry the page broadcasts — not a prop-driven counter.
    await act(async () => {
      await result.current.refresh?.();
    });
    await waitFor(() => expect(result.current.portfolioSnapshots.get('p-1')).not.toBeNull());
    expect(result.current.cashFlows['p-1'].deposits).toBe(9_999);
    rerender({ month: '2026-09' });
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
