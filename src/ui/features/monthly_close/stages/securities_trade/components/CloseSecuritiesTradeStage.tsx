import React from 'react';

import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { CloseStageChrome } from '@/ui/features/monthly_close/components/CloseStageChrome';
import { CloseStageEvidenceList } from '@/ui/features/monthly_close/components/CloseStageEvidenceList';
import type {
  FinancingInput,
  SecuritiesTradeInput,
} from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';
import { type CloseStageEvidence } from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';

import { TradeTable } from './TradeTable';
import { type TradeSide, type TradeTableRow } from './TradeTable';

interface CloseSecuritiesTradeStageProps {
  stepText: string;
  progressText: string;
  confirmedAtText: string | null;
  confirming: boolean;
  isReviewing: boolean;
  isConfirmable: boolean;
  isReadOnly: boolean;
  evidence: CloseStageEvidence;
  securities: { buys: SecuritiesTradeInput[]; sells: SecuritiesTradeInput[] };
  financing: { shareholderFinancing: FinancingInput[]; dividendPayout: FinancingInput[] };
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

const toTradeRows = (
  rows: (SecuritiesTradeInput | FinancingInput)[],
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

const toSideTradeRows = (
  buys: (SecuritiesTradeInput | FinancingInput)[],
  sells: (SecuritiesTradeInput | FinancingInput)[],
): TradeTableRow[] => [...toTradeRows(buys, 'BUY'), ...toTradeRows(sells, 'SELL')];

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
  evidence,
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
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {MONTHLY_CLOSE_LABELS.EVIDENCE_LABEL}
        </p>
        <CloseStageEvidenceList evidence={evidence} />
      </div>
      <div className="space-y-6">
        <TradeTable
          title={MONTHLY_CLOSE_LABELS.SECURITIES_TRANSACTIONS}
          sideLabels={sideLabels}
          rows={toSideTradeRows(securities.buys, securities.sells)}
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
          rows={toSideTradeRows(financing.shareholderFinancing, financing.dividendPayout)}
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
