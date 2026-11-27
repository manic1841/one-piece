import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import {
  type TradeGroupKind,
  type TradeSide,
} from '@/ui/features/monthly_close/viewmodels/tradeDraft.vm';

interface TradeKindConfig {
  sideLabels: Record<TradeSide, string>;
  /** The side that brings cash in; the summary's sign and tones derive from it. */
  inflowSide: TradeSide;
  summaryTestId: string;
  netLabel: string;
}

/**
 * Per-kind facts for the trade tables and the trade drawer: what each side is
 * called, and which side is cash in. Securities sells bring cash in; financing
 * inverts that (股東融資 is in, 發放分紅 is out), so one place owns the answer
 * instead of each caller writing its own literal.
 */
export const TRADE_KIND_CONFIG: Record<TradeGroupKind, TradeKindConfig> = {
  SECURITIES: {
    sideLabels: { BUY: MONTHLY_CLOSE_LABELS.BUY, SELL: MONTHLY_CLOSE_LABELS.SELL },
    inflowSide: 'SELL',
    summaryTestId: 'securities-summary',
    netLabel: MONTHLY_CLOSE_LABELS.NET_INVESTMENT_CASH_FLOW,
  },
  FINANCING: {
    sideLabels: {
      BUY: MONTHLY_CLOSE_LABELS.SHAREHOLDER_FINANCING,
      SELL: MONTHLY_CLOSE_LABELS.DIVIDEND_PAYOUT,
    },
    inflowSide: 'BUY',
    summaryTestId: 'financing-summary',
    netLabel: MONTHLY_CLOSE_LABELS.NET_FINANCING_CASH_FLOW,
  },
};
