import React from 'react';

import {
  type TradeCommand,
  type TradeDrawerDraft,
  type TradeGroupKind,
  type TradeRowValue,
  resolveTradeBucket,
} from '../../../viewmodels/tradeDraft.vm';
import { type TradeDrawerMode } from '../components/TradeDrawer';

export type TradeDrawerKind = TradeGroupKind;

interface TradeDrawerState {
  kind: TradeGroupKind | null;
  mode: TradeDrawerMode;
  targetId: string | null;
}

interface UseTradeDrawerOptions {
  closeMonth: Date;
}

export const useTradeDrawer = ({ closeMonth }: UseTradeDrawerOptions) => {
  const [state, setState] = React.useState<TradeDrawerState>({
    kind: null,
    mode: 'ADD',
    targetId: null,
  });

  const open = (kind: TradeGroupKind, mode: TradeDrawerMode, rowKey: string | null = null) => {
    setState({ kind, mode, targetId: rowKey });
  };

  const close = () => setState((prev) => ({ ...prev, kind: null }));

  const resolveCommand = (
    draft: TradeDrawerDraft,
    existingRow?: TradeRowValue,
  ): TradeCommand | null => {
    const { kind, mode, targetId } = state;
    if (kind === null) return null;
    const bucket = resolveTradeBucket(kind, draft.side);
    if (mode === 'ADD' || targetId === null) {
      return {
        type: 'ADD',
        bucket,
        row: {
          amount: draft.amount,
          description: draft.description,
          projectId: draft.projectId,
          date: closeMonth,
        },
      };
    }
    return {
      type: 'REPLACE',
      rowKey: targetId,
      toBucket: bucket,
      row: {
        transactionId: existingRow?.transactionId,
        amount: draft.amount,
        description: draft.description,
        projectId: draft.projectId,
        date: existingRow?.date ?? closeMonth,
      },
    };
  };

  const resolveDelete = (): TradeCommand | null =>
    state.targetId === null ? null : { type: 'DELETE', rowKey: state.targetId };

  return { state, open, close, resolveCommand, resolveDelete };
};
