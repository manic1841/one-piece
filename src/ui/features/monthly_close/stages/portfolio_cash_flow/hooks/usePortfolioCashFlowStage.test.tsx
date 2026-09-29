import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/schemas';

import { usePortfolioCashFlowStage } from './usePortfolioCashFlowStage';

vi.mock('@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase', () => ({
  listPortfolioSnapshotsUseCase: { execute: vi.fn() },
}));

const auth = { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false };

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
        auth,
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
        auth,
        confirmingStageId: null,
      }),
    );
    await waitFor(() => expect(result.current.portfolioSnapshots.size).toBe(1));
    expect(result.current.portfolioSnapshots.get('p-1')).toBeNull();
    expect(result.current.cashFlows).toEqual({});
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
          auth,
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

  it('clears the portfolio snapshot map immediately on month switch', async () => {
    vi.mocked(listPortfolioSnapshotsUseCase.execute).mockImplementation(async ({ month }) => {
      if (month === 8) {
        return [snapshot('s-1', { deposits: 1_000, withdrawals: 100 })];
      }
      return [];
    });
    const portfolios = [portfolio('p-1')];
    const { result, rerender } = renderHook(
      ({ month }: { month: string }) =>
        usePortfolioCashFlowStage({
          householdId: 'household-1',
          selectedYearMonth: month,
          portfolios,
          auth,
          confirmingStageId: null,
        }),
      { initialProps: { month: '2026-08' } },
    );
    await waitFor(() => expect(result.current.portfolioSnapshots.size).toBe(1));
    expect(result.current.portfolioSnapshots.get('p-1')?.cashFlow.deposits).toBe(1_000);
    rerender({ month: '2026-09' });
    expect(result.current.portfolioSnapshots.size).toBe(0);
    await waitFor(() => expect(result.current.portfolioSnapshots.size).toBe(1));
    expect(result.current.portfolioSnapshots.get('p-1')).toBeNull();
  });
});
