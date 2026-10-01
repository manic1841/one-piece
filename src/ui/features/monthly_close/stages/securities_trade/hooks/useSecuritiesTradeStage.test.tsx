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

type StageResult = ReturnType<typeof renderStage>['result'];

/** Drives the real drawer → form → command → draft path, the way the UI does. */
const submitTrade = async (
  result: StageResult,
  kind: 'SECURITIES' | 'FINANCING',
  amount: string,
  rowKey?: string,
) => {
  act(() => {
    result.current.drawer.open(kind, rowKey === undefined ? 'ADD' : 'EDIT', rowKey ?? null);
  });
  act(() => {
    result.current.drawerForm.form.setValue('amount', amount);
  });
  await act(async () => {
    await result.current.drawerForm.submit();
  });
};

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
      projectId: null,
    });
    expect(result.current.financing.shareholderFinancing[0]?.transactionId).toBe('tx-fin');
    expect(result.current.totalPlannedTrades).toBe(1);
  });

  it('keeps a user edit when a background reload lands (#250 seed-once)', async () => {
    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockResolvedValue(emptyMonthResult);

    const { result } = renderStage();
    await waitFor(() => expect(getMonthInvestmentFinancingUseCase.execute).toHaveBeenCalled());

    await submitTrade(result, 'SECURITIES', '999');
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
      });
    });

    expect(result.current.securities.buys).toEqual([
      {
        transactionId: 'tx-new-buy',
        amount: 7000,
        date: new Date('2026-08-05'),
        description: '交易 tx-new-buy',
        projectId: null,
      },
    ]);

    // Adoption marks the draft owned: a later reload cannot overwrite it.
    await act(async () => {
      await result.current.refresh?.();
    });
    expect(result.current.securities.buys[0]?.transactionId).toBe('tx-new-buy');
  });

  it('re-seeds the draft for the new month when the workspace remounts (#250)', async () => {
    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockResolvedValue({
      ...emptyMonthResult,
      buys: [monthTransaction('tx-aug', 1)],
    });

    const renderFor = (yearMonth: string) =>
      renderHook(() =>
        useSecuritiesTradeStage({
          householdId: 'household-1',
          selectedYearMonth: yearMonth,
          confirmingStageId: null,
        }),
      );

    const august = renderFor('2026-08');
    await waitFor(() => expect(august.result.current.securities.buys).toHaveLength(1));
    expect(august.result.current.securities.buys[0]?.transactionId).toBe('tx-aug');
    august.unmount();

    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockResolvedValue({
      ...emptyMonthResult,
      buys: [monthTransaction('tx-sep', 2)],
    });
    const { result } = renderFor('2026-09');

    await waitFor(() => expect(result.current.securities.buys[0]?.transactionId).toBe('tx-sep'));
  });

  // Regression: an unsaved row lost its identity, so editing duplicated it and deleting was a no-op.
  it('edits an unsaved row in place through the drawer instead of duplicating it', async () => {
    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockResolvedValue(emptyMonthResult);
    const { result } = renderStage();
    await waitFor(() => expect(getMonthInvestmentFinancingUseCase.execute).toHaveBeenCalled());

    await submitTrade(result, 'SECURITIES', '10');
    expect(result.current.securities.buys).toHaveLength(1);

    await submitTrade(result, 'SECURITIES', '42', 'buys:0');
    expect(result.current.securities.buys).toHaveLength(1);
    expect(result.current.securities.buys[0]?.amount).toBe(42);
  });

  it('deletes an unsaved row locally without recording a removal', async () => {
    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockResolvedValue(emptyMonthResult);
    const { result } = renderStage();
    await waitFor(() => expect(getMonthInvestmentFinancingUseCase.execute).toHaveBeenCalled());

    await submitTrade(result, 'SECURITIES', '10');
    expect(result.current.securities.buys).toHaveLength(1);

    act(() => {
      result.current.drawer.open('SECURITIES', 'EDIT', 'buys:0');
    });
    act(() => {
      result.current.handleDeleteRow();
    });

    expect(result.current.securities.buys).toHaveLength(0);
    expect(result.current.buildRequest().removedTransactionIds).toEqual([]);
    expect(result.current.drawer.state.kind).toBeNull();
  });

  it('records the removal when a persisted row is deleted', async () => {
    vi.mocked(getMonthInvestmentFinancingUseCase.execute).mockResolvedValue({
      ...emptyMonthResult,
      buys: [monthTransaction('tx-buy', 5000)],
    });
    const { result } = renderStage();
    await waitFor(() => expect(result.current.securities.buys).toHaveLength(1));

    act(() => {
      result.current.drawer.open('SECURITIES', 'EDIT', 'tx-buy');
    });
    act(() => {
      result.current.handleDeleteRow();
    });

    expect(result.current.securities.buys).toHaveLength(0);
    expect(result.current.buildRequest().removedTransactionIds).toEqual(['tx-buy']);
  });
});
