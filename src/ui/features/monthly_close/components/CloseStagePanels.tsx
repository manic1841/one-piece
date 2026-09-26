import React from 'react';

import { type CloseSummaryVM, type ReadinessVM } from '../mappers/closeSummary.mappers';
import type {
  Account,
  AccountBalanceInput,
  AccountSnapshot,
} from '../viewmodels/accountBalance.vm';
import { type DebtSectionMetaVM } from '../viewmodels/debtPayment.vm';
import type {
  DebtRepaymentInput,
  FinancingInput,
  SecuritiesTradeInput,
} from '../viewmodels/monthlyClose.vm';
import type { PortfolioSnapshot } from '../viewmodels/portfolioCashFlow.vm';
import { CloseFinancialReports } from './CloseFinancialReports';
import { CloseReadinessCheck } from './CloseReadinessCheck';
import { CloseStageInputsSection } from './CloseStageInputsSection';
import { CloseSummaryPanel } from './CloseSummaryPanel';

type StageInputId =
  | 'ACCOUNT_BALANCE'
  | 'SECURITIES_TRADE'
  | 'PORTFOLIO_CASH_FLOW'
  | 'DEBT_REPAYMENT';

const STAGE_INPUT_IDS: readonly StageInputId[] = [
  'ACCOUNT_BALANCE',
  'SECURITIES_TRADE',
  'PORTFOLIO_CASH_FLOW',
  'DEBT_REPAYMENT',
];

const isStageWithInputs = (stageId: string): stageId is StageInputId =>
  STAGE_INPUT_IDS.includes(stageId as StageInputId);

interface CloseStagePanelsProps {
  displayedStageId: string;
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
  readinessVM: ReadinessVM | null;
  closeSummaryVM: CloseSummaryVM | null;
  reportsPersisted: boolean | null;
  accounts: Account[];
  accountSnapshots: Map<string, AccountSnapshot>;
  portfolioSnapshots: Map<string, PortfolioSnapshot | null>;
  portfolios: { id: string; name: string }[];
  debtSectionMetas: DebtSectionMetaVM[];
  accountBalances: AccountBalanceInput[];
  setAccountBalances: React.Dispatch<React.SetStateAction<AccountBalanceInput[]>>;
  securities: { buys: SecuritiesTradeInput[]; sells: SecuritiesTradeInput[] };
  financing: { shareholderFinancing: FinancingInput[]; dividendPayout: FinancingInput[] };
  portfolioCashFlows: Record<string, { deposits: number; withdrawals: number }>;
  setPortfolioCashFlows: React.Dispatch<
    React.SetStateAction<Record<string, { deposits: number; withdrawals: number }>>
  >;
  repayments: DebtRepaymentInput[];
  setRepayments: React.Dispatch<React.SetStateAction<DebtRepaymentInput[]>>;
  onContinue: () => void;
  onGenerate: () => void;
  onBack: () => void;
  onConfirmStage: (stageId: string) => void;
  onGoToStage: (stageId: string) => void;
  onClosePeriod: () => void;
}

export const CloseStagePanels: React.FC<CloseStagePanelsProps> = ({
  displayedStageId,
  householdId,
  selectedYearMonth,
  confirmingStageId,
  readinessVM,
  closeSummaryVM,
  reportsPersisted,
  accounts,
  accountSnapshots,
  portfolioSnapshots,
  portfolios,
  debtSectionMetas,
  accountBalances,
  setAccountBalances,
  securities,
  financing,
  portfolioCashFlows,
  setPortfolioCashFlows,
  repayments,
  setRepayments,
  onContinue,
  onGenerate,
  onBack,
  onConfirmStage,
  onGoToStage,
  onClosePeriod,
}) => {
  if (displayedStageId === 'COMPLETENESS_CHECK' && readinessVM) {
    return (
      <CloseReadinessCheck
        readiness={readinessVM}
        onConfirm={() => onConfirmStage('COMPLETENESS_CHECK')}
        onGoToStage={onGoToStage}
        confirming={confirmingStageId === displayedStageId}
      />
    );
  }
  if (displayedStageId === 'CLOSE_PERIOD' && closeSummaryVM) {
    return (
      <CloseSummaryPanel
        summary={closeSummaryVM}
        onClose={onClosePeriod}
        confirming={confirmingStageId === displayedStageId}
      />
    );
  }
  if (displayedStageId === 'FINANCIAL_REPORTS') {
    return (
      <CloseFinancialReports
        householdId={householdId}
        year={Number(selectedYearMonth.slice(0, 4))}
        month={Number(selectedYearMonth.slice(5, 7))}
        onContinue={onContinue}
        onGenerate={onGenerate}
        onBack={onBack}
        confirming={confirmingStageId === displayedStageId}
        isGenerated={reportsPersisted ?? false}
      />
    );
  }
  if (isStageWithInputs(displayedStageId)) {
    return (
      <CloseStageInputsSection
        stageId={displayedStageId}
        yearMonth={selectedYearMonth}
        disabled={confirmingStageId !== null}
        accounts={accounts}
        accountSnapshots={accountSnapshots}
        accountBalances={accountBalances}
        setAccountBalances={setAccountBalances}
        securities={securities}
        financing={financing}
        portfolios={portfolios}
        debtSectionMetas={debtSectionMetas}
        portfolioCashFlows={portfolioCashFlows}
        setPortfolioCashFlows={setPortfolioCashFlows}
        portfolioSnapshots={portfolioSnapshots}
        repayments={repayments}
        setRepayments={setRepayments}
      />
    );
  }
  return null;
};
