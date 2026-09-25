import React from 'react';

import {
  type FinancingInput,
  type SecuritiesTradeInput,
} from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';

import { type TradeDrawerMode } from '../components/TradeDrawer';
import { type TradeSide, type TradeTableRow } from '../components/TradeTable';
import { type TradeDrawerSide } from '../viewmodels/tradeDrawer.vm';

export type TradeDrawerKind = 'SECURITIES' | 'FINANCING';

/** Draft mapped from the drawer's form VM (tradeDrawer.vm). */
export interface ConfirmDraft {
  side: TradeDrawerSide;
  amount: number;
  description?: string;
  projectId: string | null;
}

type SecuritiesRows = { buys: SecuritiesTradeInput[]; sells: SecuritiesTradeInput[] };
type FinancingRows = { shareholderFinancing: FinancingInput[]; dividendPayout: FinancingInput[] };

interface UseTradeDrawerOptions {
  securities: SecuritiesRows;
  financing: FinancingRows;
  setSecurities: React.Dispatch<React.SetStateAction<SecuritiesRows>>;
  setFinancing: React.Dispatch<React.SetStateAction<FinancingRows>>;
  removedTransactionIds: string[];
  setRemovedTransactionIds: React.Dispatch<React.SetStateAction<string[]>>;
  closeMonth: Date;
}

export const useTradeDrawer = ({
  securities,
  financing,
  setSecurities,
  setFinancing,
  removedTransactionIds,
  setRemovedTransactionIds,
  closeMonth,
}: UseTradeDrawerOptions) => {
  const [state, setState] = React.useState<{
    kind: TradeDrawerKind | null;
    mode: TradeDrawerMode;
    targetId: string | null;
  }>({ kind: null, mode: 'ADD', targetId: null });

  const toTradeRows = (
    rows: SecuritiesTradeInput[] | FinancingInput[],
    side: TradeSide,
  ): TradeTableRow[] =>
    rows.map((row) => ({
      transactionId: row.transactionId,
      side,
      amount: row.amount,
      description: row.description,
      projectId: row.projectId,
      date: row.date,
    }));

  const open = (kind: TradeDrawerKind, mode: TradeDrawerMode, row?: TradeTableRow) => {
    setState({ kind, mode, targetId: row?.transactionId ?? null });
  };

  const close = () => setState((prev) => ({ ...prev, kind: null }));

  const findSecuritiesRow = (transactionId: string): SecuritiesTradeInput | undefined =>
    [...securities.buys, ...securities.sells].find((row) => row.transactionId === transactionId);

  const findFinancingRow = (transactionId: string): FinancingInput | undefined =>
    [...financing.shareholderFinancing, ...financing.dividendPayout].find(
      (row) => row.transactionId === transactionId,
    );

  const confirmDraft = (draft: ConfirmDraft) => {
    const amount = draft.amount;
    const description = draft.description?.trim() || undefined;
    const projectId = draft.projectId;

    if (state.kind === 'SECURITIES') {
      const pickBuy = draft.side === 'BUY';
      const existing = state.targetId ? findSecuritiesRow(state.targetId) : undefined;
      const row: SecuritiesTradeInput = {
        transactionId: existing?.transactionId,
        amount,
        date: existing?.date ?? closeMonth,
        description,
        projectId,
      };
      const next = pickBuy
        ? {
            buys: existing
              ? securities.buys.map((item) =>
                  item.transactionId === existing.transactionId ? row : item,
                )
              : [...securities.buys, row],
            sells: existing
              ? securities.sells.filter((item) => item.transactionId !== existing.transactionId)
              : securities.sells,
          }
        : {
            buys: existing
              ? securities.buys.filter((item) => item.transactionId !== existing.transactionId)
              : securities.buys,
            sells: existing
              ? securities.sells.map((item) =>
                  item.transactionId === existing.transactionId ? row : item,
                )
              : [...securities.sells, row],
          };
      setSecurities(next);
    } else if (state.kind === 'FINANCING') {
      const pickFinancing = draft.side === 'BUY';
      const existing = state.targetId ? findFinancingRow(state.targetId) : undefined;
      const row: FinancingInput = {
        transactionId: existing?.transactionId,
        amount,
        date: existing?.date ?? closeMonth,
        description,
        projectId,
      };
      const next = pickFinancing
        ? {
            shareholderFinancing: existing
              ? financing.shareholderFinancing.map((item) =>
                  item.transactionId === existing.transactionId ? row : item,
                )
              : [...financing.shareholderFinancing, row],
            dividendPayout: existing
              ? financing.dividendPayout.filter(
                  (item) => item.transactionId !== existing.transactionId,
                )
              : financing.dividendPayout,
          }
        : {
            shareholderFinancing: existing
              ? financing.shareholderFinancing.filter(
                  (item) => item.transactionId !== existing.transactionId,
                )
              : financing.shareholderFinancing,
            dividendPayout: existing
              ? financing.dividendPayout.map((item) =>
                  item.transactionId === existing.transactionId ? row : item,
                )
              : [...financing.dividendPayout, row],
          };
      setFinancing(next);
    }
    close();
  };

  const deleteRow = () => {
    if (state.kind === 'SECURITIES') {
      setSecurities({
        buys: securities.buys.filter((item) => item.transactionId !== state.targetId),
        sells: securities.sells.filter((item) => item.transactionId !== state.targetId),
      });
    } else if (state.kind === 'FINANCING') {
      setFinancing({
        shareholderFinancing: financing.shareholderFinancing.filter(
          (item) => item.transactionId !== state.targetId,
        ),
        dividendPayout: financing.dividendPayout.filter(
          (item) => item.transactionId !== state.targetId,
        ),
      });
    }
    // Unsaved rows (targetId null) are local only: filter against null matches
    // them, and they must not enter removedTransactionIds.
    if (
      state.targetId &&
      !removedTransactionIds.includes(state.targetId) &&
      [
        ...securities.buys,
        ...securities.sells,
        ...financing.shareholderFinancing,
        ...financing.dividendPayout,
      ].some((item) => item.transactionId === state.targetId)
    ) {
      setRemovedTransactionIds([...removedTransactionIds, state.targetId]);
    }
    close();
  };

  /** The loaded row being edited, resolved by transaction ID; feeds the drawer prefill. */
  const findRow = (
    transactionId: string | null,
  ):
    | { side: TradeDrawerSide; amount?: number; description?: string; projectId?: string | null }
    | undefined => {
    if (!transactionId) return undefined;
    const buyRow = securities.buys.find((row) => row.transactionId === transactionId);
    if (buyRow) return { side: 'BUY' as const, ...buyRow };
    const sellRow = securities.sells.find((row) => row.transactionId === transactionId);
    if (sellRow) return { side: 'SELL' as const, ...sellRow };
    const financingRow = financing.shareholderFinancing.find(
      (row) => row.transactionId === transactionId,
    );
    if (financingRow) return { side: 'BUY' as const, ...financingRow };
    const payoutRow = financing.dividendPayout.find((row) => row.transactionId === transactionId);
    if (payoutRow) return { side: 'SELL' as const, ...payoutRow };
    return undefined;
  };

  return { state, toTradeRows, open, close, confirmDraft, deleteRow, findRow };
};
