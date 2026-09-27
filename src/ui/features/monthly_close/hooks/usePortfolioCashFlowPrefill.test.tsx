import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/schemas';

import { usePortfolioCashFlowPrefill } from './usePortfolioCashFlowPrefill';
import { usePortfolioCashFlowStage } from './usePortfolioCashFlowStage';

vi.mock('@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase', () => ({
  listPortfolioSnapshotsUseCase: { execute: vi.fn() },
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

const snapshot = (
  id: string,
  cashFlow: { deposits: number; withdrawals: number },
): PortfolioSnapshot =>
  ({
    id,
    cashFlow,
  }) as unknown as PortfolioSnapshot;

describe('usePortfolioCashFlowPrefill', () => {
  const setCashFlows = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seeds the draft from the month snapshots once all are loaded', () => {
    const portfolios = [portfolio('p-1'), portfolio('p-2')];
    const portfolioSnapshots = new Map([
      ['p-1', snapshot('s-1', { deposits: 1_000, withdrawals: 200 })],
      ['p-2', snapshot('s-2', { deposits: 0, withdrawals: 0 })],
    ]);

    renderHook(() =>
      usePortfolioCashFlowPrefill({
        selectedYearMonth: '2026-08',
        portfolios,
        portfolioSnapshots,
        setCashFlows,
      }),
    );

    expect(setCashFlows).toHaveBeenCalledWith({
      'p-1': { deposits: 1_000, withdrawals: 200 },
      'p-2': { deposits: 0, withdrawals: 0 },
    });
  });

  it('waits until every portfolio has a snapshot entry before seeding', () => {
    const portfolios = [portfolio('p-1'), portfolio('p-2')];
    const portfolioSnapshots = new Map([
      ['p-1', snapshot('s-1', { deposits: 500, withdrawals: 0 })],
    ]);

    renderHook(() =>
      usePortfolioCashFlowPrefill({
        selectedYearMonth: '2026-08',
        portfolios,
        portfolioSnapshots,
        setCashFlows,
      }),
    );

    expect(setCashFlows).not.toHaveBeenCalled();
  });

  it('does not seed a snapshot-less portfolio even when the map is full', () => {
    const portfolios = [portfolio('p-1')];
    const portfolioSnapshots = new Map<string, PortfolioSnapshot | null>([['p-1', null]]);

    renderHook(() =>
      usePortfolioCashFlowPrefill({
        selectedYearMonth: '2026-08',
        portfolios,
        portfolioSnapshots,
        setCashFlows,
      }),
    );

    expect(setCashFlows).not.toHaveBeenCalled();
  });

  it('seeds once per month and never overwrites later edits', () => {
    const portfolios = [portfolio('p-1')];
    const portfolioSnapshots = new Map([
      ['p-1', snapshot('s-1', { deposits: 700, withdrawals: 0 })],
    ]);

    const { rerender } = renderHook(
      ({ month, snapshots }: { month: string; snapshots: Map<string, PortfolioSnapshot | null> }) =>
        usePortfolioCashFlowPrefill({
          selectedYearMonth: month,
          portfolios,
          portfolioSnapshots: snapshots,
          setCashFlows,
        }),
      { initialProps: { month: '2026-08', snapshots: portfolioSnapshots } },
    );

    expect(setCashFlows).toHaveBeenCalledTimes(1);

    // A refresh re-delivers the same month's snapshots; the seed must not
    // re-run and clobber user edits.
    act(() => {
      rerender({ month: '2026-08', snapshots: portfolioSnapshots });
    });
    expect(setCashFlows).toHaveBeenCalledTimes(1);

    // A month switch retires the draft and re-seeds for the new month.
    rerender({ month: '2026-09', snapshots: portfolioSnapshots });
    expect(setCashFlows).toHaveBeenCalledTimes(2);
  });

  it('builds the confirm request payload from the seeded draft end-to-end', () => {
    const portfolios = [portfolio('p-1'), portfolio('p-2')];
    const portfolioSnapshots = new Map([
      ['p-1', snapshot('s-1', { deposits: 1_500, withdrawals: 300 })],
      ['p-2', snapshot('s-2', { deposits: 0, withdrawals: 450 })],
    ]);

    const { result } = renderHook(() => {
      const stage = usePortfolioCashFlowStage({ confirmingStageId: null });
      usePortfolioCashFlowPrefill({
        selectedYearMonth: '2026-08',
        portfolios,
        portfolioSnapshots,
        setCashFlows: stage.setCashFlows,
      });
      return stage;
    });

    expect(result.current.buildRequest()).toEqual({
      stageId: 'PORTFOLIO_CASH_FLOW',
      portfolioCashFlows: {
        'p-1': { deposits: 1_500, withdrawals: 300 },
        'p-2': { deposits: 0, withdrawals: 450 },
      },
    });
  });
});
