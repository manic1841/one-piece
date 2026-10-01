import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMonthInvestmentFinancingUseCase } from '@/application/monthly_close/use_cases/getMonthInvestmentFinancingUseCase';

import { useSecuritiesTradeStage } from './useSecuritiesTradeStage';

vi.mock('@/application/monthly_close/use_cases/getMonthInvestmentFinancingUseCase', () => ({
  getMonthInvestmentFinancingUseCase: { execute: vi.fn() },
}));

const { confirmDialog } = vi.hoisted(() => ({ confirmDialog: vi.fn().mockResolvedValue(true) }));
vi.mock('@/ui/features/app/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmDialog }),
}));

const monthTransaction = (id: string, amount: number) => ({
  id,
  amount,
  date: new Date('2026-08-05'),
  description: `交易 ${id}`,
});

const emptyMonthResult = {
  buys: [],
  sells: [],
  shareholderFinancing: [],
  dividendPayout: [],
};

const renderStage = (selectedYearMonth = '2026-08') =>
  renderHook(() =>
    useSecuritiesTradeStage({
      householdId: 'household-1',
      selectedYearMonth,
      confirmingStageId: null,
    }),
  );

describe('useSecuritiesTradeStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmDialog.mockResolvedValue(true);
  });

  it('prefills the month transactions as editable rows carrying their IDs', async () => {
    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockResolvedValue({
      buys: [monthTransaction('tx-buy', 5000)],
      sells: [],
      shareholderFinancing: [monthTransaction('tx-fin', 10_000)],
      dividendPayout: [],
    });

    const { result } = renderStage();

    await waitFor(() => expect(result.current.securities.buys).toHaveLength(1));
    expect(result.current.securities.buys[0]).toEqual({
      transactionId: 'tx-buy',
      amount: 5000,
      date: new Date('2026-08-05'),
      description: '交易 tx-buy',
      projectId: undefined,
    });
    expect(result.current.financing.shareholderFinancing[0]?.transactionId).toBe('tx-fin');
    expect(result.current.totalPlannedTrades).toBe(1);
  });

  it('keeps a user edit when a background reload lands (#250 seed-once)', async () => {
    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockResolvedValue(emptyMonthResult);

    const { result } = renderStage();
    await waitFor(() => expect(getMonthInvestmentFinancingUseCase.execute).toHaveBeenCalled());

    act(() => {
      result.current.setSecurities((previous) => ({
        ...previous,
        buys: [{ transactionId: undefined, amount: 999, date: new Date(), projectId: undefined }],
      }));
    });
    expect(result.current.securities.buys).toHaveLength(1);

    // A later reload returns different (or empty) rows and must not clear the draft.
    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockResolvedValue(emptyMonthResult);
    await act(async () => {
      await result.current.refresh?.();
    });

    expect(result.current.securities.buys).toHaveLength(1);
    expect(result.current.securities.buys[0]?.amount).toBe(999);
  });

  it('exposes canned copy when the prefill fails to load', async () => {
    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockRejectedValue(new Error('boom'));

    const { result } = renderStage();

    await waitFor(() =>
      expect(result.current.errorMessage).toBe('無法載入本月投資與融資交易，請稍後再試。'),
    );
    expect(result.current.securities.buys).toEqual([]);
  });

  it('adopts the confirmed authoritative rows and marks the draft owned', async () => {
    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockResolvedValue(emptyMonthResult);

    const { result } = renderStage();
    await waitFor(() => expect(getMonthInvestmentFinancingUseCase.execute).toHaveBeenCalled());

    act(() => {
      result.current.afterConfirm({
        period: {
          id: 'p1',
          householdId: 'household-1',
          yearMonth: '2026-08',
          status: 'PENDING',
        } as never,
        securities: {
          buys: [
            {
              transactionId: 'tx-new-buy',
              amount: 7000,
              date: new Date('2026-08-05'),
              description: '交易 tx-new-buy',
            },
          ],
          sells: [],
          shareholderFinancing: [],
          dividendPayout: [],
        },
      });
    });

    expect(result.current.securities.buys).toEqual([
      {
        transactionId: 'tx-new-buy',
        amount: 7000,
        date: new Date('2026-08-05'),
        description: '交易 tx-new-buy',
        projectId: undefined,
      },
    ]);

    // Adoption marks the draft owned: a later reload cannot overwrite it.
    await act(async () => {
      await result.current.refresh?.();
    });
    expect(result.current.securities.buys[0]?.transactionId).toBe('tx-new-buy');
  });

  it('re-seeds the draft for the new month on a month switch (#250)', async () => {
    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockResolvedValue({
      ...emptyMonthResult,
      buys: [monthTransaction('tx-aug', 1)],
    });

    const { result, rerender } = renderHook(
      ({ yearMonth }: { yearMonth: string }) =>
        useSecuritiesTradeStage({
          householdId: 'household-1',
          selectedYearMonth: yearMonth,
          confirmingStageId: null,
        }),
      { initialProps: { yearMonth: '2026-08' } },
    );
    await waitFor(() => expect(result.current.securities.buys).toHaveLength(1));

    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockResolvedValue({
      ...emptyMonthResult,
      buys: [monthTransaction('tx-sep', 2)],
    });
    rerender({ yearMonth: '2026-09' });

    await waitFor(() => expect(result.current.securities.buys[0]?.transactionId).toBe('tx-sep'));
  });
});
