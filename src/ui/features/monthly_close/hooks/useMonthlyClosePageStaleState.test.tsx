import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/schemas';

import { useDebtRepaymentStage } from './useDebtRepaymentStage';
import { usePortfolioSnapshotPrefill } from './usePortfolioSnapshotPrefill';

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

describe('month-switch stale state regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        usePortfolioSnapshotPrefill({
          householdId: 'household-1',
          selectedYearMonth: month,
          portfolios,
          auth,
        }),
      { initialProps: { month: '2026-08' } },
    );

    await waitFor(() => expect(result.current.size).toBe(1));
    expect(result.current.get('p-1')?.cashFlow.deposits).toBe(1_000);

    rerender({ month: '2026-09' });

    expect(result.current.size).toBe(0);
    await waitFor(() => expect(result.current.size).toBe(1));
    expect(result.current.get('p-1')).toBeNull();
  });

  it('wires the debt stage resetDraft through resetRepayments', () => {
    const resetRepayments = vi.fn();

    const { result } = renderHook(() =>
      useDebtRepaymentStage({
        confirmingStageId: null,
        repayments: [{ debtAccountId: 'debt-1', totalPayment: 9_999, date: new Date() }],
        resetRepayments,
      }),
    );

    expect(result.current.buildRequest()).toEqual({
      stageId: 'DEBT_REPAYMENT',
      repayments: [{ debtAccountId: 'debt-1', totalPayment: 9_999, date: expect.any(Date) }],
    });

    act(() => {
      result.current.resetDraft();
    });
    expect(resetRepayments).toHaveBeenCalledTimes(1);
  });
});
