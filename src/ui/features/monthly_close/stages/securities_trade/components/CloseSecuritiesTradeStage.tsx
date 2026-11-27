import React from 'react';

import { Button } from '@/ui/components/ui/button';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { CloseStageChrome } from '@/ui/features/monthly_close/components/CloseStageChrome';
import { CloseStageLoadError } from '@/ui/features/monthly_close/components/CloseStageLoadError';
import {
  type TradeRowValue,
  type TradeTableRow,
  projectTradeRows,
} from '@/ui/features/monthly_close/viewmodels/tradeDraft.vm';

import { TRADE_KIND_CONFIG } from '../tradeKindConfig';
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
  // An empty step is not a blocker, so it says so inline instead of gating the
  // confirm behind a modal that only repeats the same sentence.
  const isEmpty =
    securities.buys.length === 0 &&
    securities.sells.length === 0 &&
    financing.shareholderFinancing.length === 0 &&
    financing.dividendPayout.length === 0;

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
      {isEmpty && (
        /* Nothing to fill in, so the confirmation sits where the emptiness is
           instead of interrupting with a dialog. */
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.EMPTY_STAGE_NOTE}</p>
          {!isReadOnly && (
            <Button
              size="sm"
              data-testid="confirm-empty-stage"
              disabled={!isConfirmable || confirming}
              onClick={onConfirm}
              className="min-h-11 shrink-0 active:scale-[0.97]"
            >
              {MONTHLY_CLOSE_LABELS.RECONFIRM_ACTION}
            </Button>
          )}
        </div>
      )}
      <div className="space-y-6">
        <TradeTable
          title={MONTHLY_CLOSE_LABELS.SECURITIES_TRANSACTIONS}
          sideLabels={TRADE_KIND_CONFIG.SECURITIES.sideLabels}
          netLabel={TRADE_KIND_CONFIG.SECURITIES.netLabel}
          rows={[
            ...projectTradeRows('buys', securities.buys),
            ...projectTradeRows('sells', securities.sells),
          ]}
          inflowSide={TRADE_KIND_CONFIG.SECURITIES.inflowSide}
          summaryTestId={TRADE_KIND_CONFIG.SECURITIES.summaryTestId}
          projectIdName={projectNameOf}
          onAdd={() => onOpenTradeDrawer('SECURITIES')}
          onRowClick={(row) => onOpenTradeDrawer('SECURITIES', row)}
          disabled={confirming || isReadOnly}
          hideAdd={isReadOnly}
        />
        <TradeTable
          title={MONTHLY_CLOSE_LABELS.FINANCING_RECORDS}
          sideLabels={TRADE_KIND_CONFIG.FINANCING.sideLabels}
          netLabel={TRADE_KIND_CONFIG.FINANCING.netLabel}
          rows={[
            ...projectTradeRows('shareholderFinancing', financing.shareholderFinancing),
            ...projectTradeRows('dividendPayout', financing.dividendPayout),
          ]}
          inflowSide={TRADE_KIND_CONFIG.FINANCING.inflowSide}
          summaryTestId={TRADE_KIND_CONFIG.FINANCING.summaryTestId}
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
