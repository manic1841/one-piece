import React from 'react';

import { type CloseSummaryVM, type ReadinessVM } from '../mappers/closeSummary.mappers';
import type {
  Account,
  AccountBalanceInput,
  AccountSnapshot,
} from '../viewmodels/accountBalance.vm';
import { type DebtSectionMetaVM } from '../viewmodels/debtPayment.vm';
import type {
  CloseStageItemVM,
  DebtRepaymentInput,
  FinancingInput,
  SecuritiesTradeInput,
} from '../viewmodels/monthlyClose.vm';
import type { PortfolioSnapshot } from '../viewmodels/portfolioCashFlow.vm';
import { CloseFinancialReports } from './CloseFinancialReports';
import { CloseReadinessCheck } from './CloseReadinessCheck';
import { CloseStageInputsSection } from './CloseStageInputsSection';
import { CloseSummaryPanel } from './CloseSummaryPanel';
import { CloseWorkspace } from './CloseWorkspace';

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

type SpecialStageId = 'COMPLETENESS_CHECK' | 'FINANCIAL_REPORTS' | 'CLOSE_PERIOD';

interface SpecialPanelContext {
  householdId: string;
  selectedYearMonth: string;
  confirming: boolean;
  readinessVM: ReadinessVM | null;
  closeSummaryVM: CloseSummaryVM | null;
  reportsPersisted: boolean | null;
  onConfirmStage: (stageId: string) => void;
  onGoToStage: (stageId: string) => void;
  onClosePeriod: () => void;
  onContinue: () => void;
  onGenerate: () => void;
  onBack: () => void;
}

// Stage-id keyed panel registry: dispatch is an explicit map, not a condition
// chain, so a stage can never be dispatched with the wrong key. Record over
// SpecialStageId forces an entry for every special stage. A factory returns
// null when its data has not loaded yet (readiness VM, close summary).
const SPECIAL_PANELS: Record<SpecialStageId, (ctx: SpecialPanelContext) => React.ReactNode> = {
  COMPLETENESS_CHECK: ({ readinessVM, confirming, onConfirmStage, onGoToStage }) =>
    readinessVM ? (
      <CloseReadinessCheck
        readiness={readinessVM}
        onConfirm={() => onConfirmStage('COMPLETENESS_CHECK')}
        onGoToStage={onGoToStage}
        confirming={confirming}
      />
    ) : null,
  FINANCIAL_REPORTS: ({
    householdId,
    selectedYearMonth,
    confirming,
    reportsPersisted,
    onContinue,
    onGenerate,
    onBack,
  }) => (
    <CloseFinancialReports
      householdId={householdId}
      year={Number(selectedYearMonth.slice(0, 4))}
      month={Number(selectedYearMonth.slice(5, 7))}
      onContinue={onContinue}
      onGenerate={onGenerate}
      onBack={onBack}
      confirming={confirming}
      isGenerated={reportsPersisted ?? false}
    />
  ),
  CLOSE_PERIOD: ({ closeSummaryVM, confirming, onClosePeriod }) =>
    closeSummaryVM ? (
      <CloseSummaryPanel summary={closeSummaryVM} onClose={onClosePeriod} confirming={confirming} />
    ) : null,
};

const SPECIAL_STAGE_IDS = new Set<string>(Object.keys(SPECIAL_PANELS));

interface CloseStagePanelsProps {
  displayedStageId: string;
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
  readinessVM: ReadinessVM | null;
  closeSummaryVM: CloseSummaryVM | null;
  reportsPersisted: boolean | null;
  /** The displayed stage's pipeline VM: workspace frame header and confirm-at text. */
  stage: CloseStageItemVM | null;
  stepText: string;
  isReviewing: boolean;
  progressText: string;
  isClosed: boolean;
  /** The displayed stage's evidence list; workspace stages render it above the inputs. */
  evidence: React.ReactNode;
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
  stage,
  stepText,
  isReviewing,
  progressText,
  isClosed,
  evidence,
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
  // Workspace stages (1-6) share the CloseWorkspace frame; special stages
  // dispatch through the stage-id keyed registry. TRANSACTION_VALIDATION and
  // PROJECT_SETTLEMENT are workspace stages without inputs (evidence only).
  // A special stage whose data has not loaded returns null: no wrong frame.
  if (SPECIAL_STAGE_IDS.has(displayedStageId)) {
    return SPECIAL_PANELS[displayedStageId as SpecialStageId]({
      householdId,
      selectedYearMonth,
      confirming: confirmingStageId === displayedStageId,
      readinessVM,
      closeSummaryVM,
      reportsPersisted,
      onConfirmStage,
      onGoToStage,
      onClosePeriod,
      onContinue,
      onGenerate,
      onBack,
    });
  }

  const workspaceInputs = isStageWithInputs(displayedStageId) ? (
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
  ) : null;

  return (
    <CloseWorkspace
      stage={stage ?? null}
      stepText={stepText}
      isReviewing={isReviewing}
      progressText={progressText}
      confirming={confirmingStageId === displayedStageId}
      isClosed={isClosed}
      evidence={evidence}
      inputs={workspaceInputs}
      onConfirm={() => onConfirmStage(displayedStageId)}
      onBackToCurrent={onBack}
    />
  );
};
