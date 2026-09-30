import React from 'react';

import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import type {
  TradeDrawerInput,
  TradeDrawerSide,
  TradeDrawerVM,
} from '../../../viewmodels/tradeDrawer.vm';
import { TradeDrawer, type TradeDrawerProps } from './TradeDrawer';

interface CloseTradeDrawerSectionProps {
  kind: 'SECURITIES' | 'FINANCING' | null;
  mode: 'ADD' | 'EDIT';
  form: unknown;
  projects: { id: string; name: string }[];
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

const TRADE_SIDES: readonly TradeDrawerSide[] = ['BUY', 'SELL'];
const TRADE_SIDE_LABELS: Record<TradeDrawerSide, string> = {
  BUY: MONTHLY_CLOSE_LABELS.BUY,
  SELL: MONTHLY_CLOSE_LABELS.SELL,
};
const FINANCING_SIDE_LABELS: Record<TradeDrawerSide, string> = {
  BUY: MONTHLY_CLOSE_LABELS.SHAREHOLDER_FINANCING,
  SELL: MONTHLY_CLOSE_LABELS.DIVIDEND_PAYOUT,
};

/** Maps the drawer's kind/mode state to its title, so the page stays flat. */
const drawerTitle = (kind: 'SECURITIES' | 'FINANCING' | null, mode: 'ADD' | 'EDIT'): string => {
  if (kind === 'FINANCING') {
    return mode === 'ADD'
      ? MONTHLY_CLOSE_LABELS.ADD_FINANCING_TRANSACTION
      : MONTHLY_CLOSE_LABELS.EDIT_TRANSACTION;
  }
  return mode === 'ADD'
    ? MONTHLY_CLOSE_LABELS.ADD_SECURITIES_TRANSACTION
    : MONTHLY_CLOSE_LABELS.EDIT_TRANSACTION;
};

export const CloseTradeDrawerSection: React.FC<CloseTradeDrawerSectionProps> = ({
  kind,
  mode,
  form,
  projects,
  submitting,
  onConfirm,
  onCancel,
  onDelete,
}) => {
  return (
    <TradeDrawer
      open={kind !== null}
      sides={TRADE_SIDES}
      sideLabels={kind === 'FINANCING' ? FINANCING_SIDE_LABELS : TRADE_SIDE_LABELS}
      title={drawerTitle(kind, mode)}
      form={form as TradeDrawerProps['form']}
      projects={projects}
      canDelete
      submitting={submitting}
      onConfirm={onConfirm}
      onCancel={onCancel}
      onDelete={onDelete}
    />
  );
};

export type { TradeDrawerInput, TradeDrawerVM };
