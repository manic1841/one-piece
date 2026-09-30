import React from 'react';

import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { CloseStageChrome } from '@/ui/features/monthly_close/components/CloseStageChrome';
import { CloseStageEvidenceList } from '@/ui/features/monthly_close/components/CloseStageEvidenceList';
import { CloseStageLoadError } from '@/ui/features/monthly_close/components/CloseStageLoadError';
import { type CloseStageEvidence } from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';
import type { PortfolioSnapshot } from '@/ui/features/monthly_close/viewmodels/portfolioCashFlow.vm';
import {
  buildPortfolioCashFlowSections,
  buildPortfolioCashFlowTotal,
} from '@/ui/features/monthly_close/viewmodels/portfolioCashFlow.vm';
import { formatCurrency, formatPercentage } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

import { PortfolioCashFlowAccordion, PortfolioCashFlowSection } from './PortfolioCashFlowSection';

interface ClosePortfolioCashFlowStageProps {
  stepText: string;
  progressText: string;
  confirmedAtText: string | null;
  confirming: boolean;
  isReviewing: boolean;
  isConfirmable: boolean;
  isReadOnly: boolean;
  evidence: CloseStageEvidence;
  /** Canned copy when the snapshot load failed; prefill is a convenience, so it does not block confirm. */
  loadErrorMessage?: string | null;
  portfolios: { id: string; name: string }[];
  portfolioSnapshots: Map<string, PortfolioSnapshot | null>;
  cashFlows: Record<string, { deposits: number; withdrawals: number }>;
  setCashFlows: React.Dispatch<
    React.SetStateAction<Record<string, { deposits: number; withdrawals: number }>>
  >;
  onConfirm: () => void;
  onBackToCurrent: () => void;
}

const PortfolioCashFlowContent: React.FC<{
  portfolios: ClosePortfolioCashFlowStageProps['portfolios'];
  portfolioSnapshots: ClosePortfolioCashFlowStageProps['portfolioSnapshots'];
  cashFlows: ClosePortfolioCashFlowStageProps['cashFlows'];
  setCashFlows: ClosePortfolioCashFlowStageProps['setCashFlows'];
  disabled: boolean;
}> = ({ portfolios, portfolioSnapshots, cashFlows, setCashFlows, disabled }) => {
  const snapshotFor = (portfolioId: string) => portfolioSnapshots.get(portfolioId);

  const handleDepositsChange = (portfolioId: string, value: number) => {
    setCashFlows({
      ...cashFlows,
      [portfolioId]: {
        deposits: value,
        withdrawals:
          cashFlows[portfolioId]?.withdrawals ??
          snapshotFor(portfolioId)?.cashFlow.withdrawals ??
          0,
      },
    });
  };

  const handleWithdrawalsChange = (portfolioId: string, value: number) => {
    setCashFlows({
      ...cashFlows,
      [portfolioId]: {
        deposits:
          cashFlows[portfolioId]?.deposits ?? snapshotFor(portfolioId)?.cashFlow.deposits ?? 0,
        withdrawals: value,
      },
    });
  };

  if (portfolios.length === 0) {
    return <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_DATA}</p>;
  }

  const sections = buildPortfolioCashFlowSections({
    portfolios,
    snapshots: portfolioSnapshots,
    portfolioCashFlows: cashFlows,
  });
  const total = buildPortfolioCashFlowTotal(sections);

  return (
    <div className="space-y-6">
      <div className="hidden md:block md:space-y-6">
        {sections.map((section, index) => (
          <React.Fragment key={section.portfolioId}>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{section.portfolioName}</p>
              <PortfolioCashFlowSection
                section={section}
                disabled={disabled}
                onDepositsChange={handleDepositsChange}
                onWithdrawalsChange={handleWithdrawalsChange}
              />
            </div>
            {index < sections.length - 1 && <div className="border-t border-border" />}
          </React.Fragment>
        ))}
      </div>
      <div className="md:hidden">
        <PortfolioCashFlowAccordion
          sections={sections}
          disabled={disabled}
          onDepositsChange={handleDepositsChange}
          onWithdrawalsChange={handleWithdrawalsChange}
        />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {MONTHLY_CLOSE_LABELS.TOTAL_RETURN}
        </p>
        <div className="flex items-center gap-4">
          <p
            className={cn(
              'font-mono text-sm tabular-nums',
              total.gain > 0
                ? 'text-positive'
                : total.gain < 0
                  ? 'text-negative'
                  : 'text-foreground',
            )}
          >
            {formatCurrency(total.gain)}
          </p>
          <p
            className={cn(
              'font-mono text-sm tabular-nums',
              total.returnRate > 0
                ? 'text-positive'
                : total.returnRate < 0
                  ? 'text-negative'
                  : 'text-foreground',
            )}
          >
            {formatPercentage(total.returnRate, 2)}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * PORTFOLIO_CASH_FLOW step: the per-portfolio cash-flow inputs rendered inside
 * the shared chrome with the stage evidence above them.
 */
export const ClosePortfolioCashFlowStage: React.FC<ClosePortfolioCashFlowStageProps> = ({
  stepText,
  progressText,
  confirmedAtText,
  confirming,
  isReviewing,
  isConfirmable,
  isReadOnly,
  evidence,
  loadErrorMessage = null,
  portfolios,
  portfolioSnapshots,
  cashFlows,
  setCashFlows,
  onConfirm,
  onBackToCurrent,
}) => (
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
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {MONTHLY_CLOSE_LABELS.EVIDENCE_LABEL}
      </p>
      <CloseStageEvidenceList evidence={evidence} />
    </div>
    <PortfolioCashFlowContent
      portfolios={portfolios}
      portfolioSnapshots={portfolioSnapshots}
      cashFlows={cashFlows}
      setCashFlows={setCashFlows}
      disabled={confirming || isReadOnly}
    />
  </CloseStageChrome>
);
