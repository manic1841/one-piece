import React from 'react';

import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { CloseStageChrome } from '@/ui/features/monthly_close/components/CloseStageChrome';
import { CloseStageLoadError } from '@/ui/features/monthly_close/components/CloseStageLoadError';
import {
  type TradeRowValue,
  type TradeSide,
  type TradeTableRow,
  projectTradeRows,
} from '@/ui/features/monthly_close/viewmodels/tradeDraft.vm';

import { TradeTable } from './TradeTable';

interface CloseSecuritiesTradeStageProps {
  stepText: string;
  progressText: string;
  confirmedAtText: string | null;
  confirming: boolean;
  isReviewing: boolean;
  isConfirmable: boolean;
  isReadOnly: boolean;
  /** Canned copy when the prefill load failed; prefill is a convenience, so it does not block confirm. */
  loadErrorMessage?: string | null;
  securities: { buys: TradeRowValue[]; sells: TradeRowValue[] };
  financing: { shareholderFinancing: TradeRowValue[]; dividendPayout: TradeRowValue[] };
  projects: { id: string; name: string }[];
  /** Opens the add/edit drawer for the securities or financing table. */
  onOpenTradeDrawer: (kind: 'SECURITIES' | 'FINANCING', row?: TradeTableRow) => void;
  onConfirm: () => void;
  onBackToCurrent: () => void;
}

const sideLabels: Record<TradeSide, string> = {
  BUY: MONTHLY_CLOSE_LABELS.BUY,
  SELL: MONTHLY_CLOSE_LABELS.SELL,
};

const financingSideLabels: Record<TradeSide, string> = {
  BUY: MONTHLY_CLOSE_LABELS.SHAREHOLDER_FINANCING,
  SELL: MONTHLY_CLOSE_LABELS.DIVIDEND_PAYOUT,
};

/**
 * SECURITIES_TRADE step: the securities and financing TradeTables rendered
 * inside the shared chrome with the stage evidence above them.
 */
export const CloseSecuritiesTradeStage: React.FC<CloseSecuritiesTradeStageProps> = ({
  stepText,
  progressText,
  confirmedAtText,
  confirming,
  isReviewing,
  isConfirmable,
  isReadOnly,
  loadErrorMessage = null,
  securities,
  financing,
  projects,
  onOpenTradeDrawer,
  onConfirm,
  onBackToCurrent,
}) => {
  const projectNameOf = (projectId: string | null | undefined) =>
    projects.find((project) => project.id === projectId)?.name ?? null;

  return (
    <CloseStageChrome
      stepText={stepText}
      progressText={progressText}
      confirmedAtText={confirmedAtText}
      confirming={confirming}
      isReviewing={isReviewing}
      isConfirmable={isConfirmable}
      isReadOnly={isReadOnly}
      showActions
      onConfirm={onConfirm}
      onBackToCurrent={onBackToCurrent}
    >
      <CloseStageLoadError message={loadErrorMessage} />
      <div className="space-y-6">
        <TradeTable
          title={MONTHLY_CLOSE_LABELS.SECURITIES_TRANSACTIONS}
          sideLabels={sideLabels}
          rows={[
            ...projectTradeRows('buys', securities.buys),
            ...projectTradeRows('sells', securities.sells),
          ]}
          projectIdName={projectNameOf}
          onAdd={() => onOpenTradeDrawer('SECURITIES')}
          onRowClick={(row) => onOpenTradeDrawer('SECURITIES', row)}
          disabled={confirming || isReadOnly}
          hideAdd={isReadOnly}
        />
        <TradeTable
          title={MONTHLY_CLOSE_LABELS.FINANCING_RECORDS}
          sideLabels={financingSideLabels}
          netLabel={MONTHLY_CLOSE_LABELS.NET_FINANCING_CASH_FLOW}
          rows={[
            ...projectTradeRows('shareholderFinancing', financing.shareholderFinancing),
            ...projectTradeRows('dividendPayout', financing.dividendPayout),
          ]}
          projectIdName={projectNameOf}
          onAdd={() => onOpenTradeDrawer('FINANCING')}
          onRowClick={(row) => onOpenTradeDrawer('FINANCING', row)}
          disabled={confirming || isReadOnly}
          hideAdd={isReadOnly}
        />
      </div>
    </CloseStageChrome>
  );
};
