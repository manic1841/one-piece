import React from 'react';

import { type CloseSummaryVM, type ReadinessVM } from '../mappers/closeSummary.mappers';
import { CloseAccountBalanceStage } from '../stages/account_balance/components/CloseAccountBalanceStage';
import { CloseDebtRepaymentStage } from '../stages/debt_repayment/components/CloseDebtRepaymentStage';
import { ClosePortfolioCashFlowStage } from '../stages/portfolio_cash_flow/components/ClosePortfolioCashFlowStage';
import { CloseSecuritiesTradeStage } from '../stages/securities_trade/components/CloseSecuritiesTradeStage';
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
import type { CloseStageEvidence } from '../viewmodels/monthlyClose.vm';
import type { PortfolioSnapshot } from '../viewmodels/portfolioCashFlow.vm';
import { CloseEvidenceOnlyStage } from './CloseEvidenceOnlyStage';
import { CloseFinancialReports } from './CloseFinancialReports';
import { CloseReadinessCheck } from './CloseReadinessCheck';
import { CloseSummaryPanel } from './CloseSummaryPanel';
import { type TradeTableRow } from './TradeTable';

type SpecialStageId = 'COMPLETENESS_CHECK' | 'FINANCIAL_REPORTS' | 'CLOSE_PERIOD';

interface SpecialPanelContext {
  householdId: string;
  selectedYearMonth: string;
  confirming: boolean;
  /** While paused, only the walk position's confirm button is enabled (ADR-0070). */
  isConfirmable: boolean;
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
  COMPLETENESS_CHECK: ({ readinessVM, confirming, isConfirmable, onConfirmStage, onGoToStage }) =>
    readinessVM ? (
      <CloseReadinessCheck
        readiness={readinessVM}
        onConfirm={() => onConfirmStage('COMPLETENESS_CHECK')}
        onGoToStage={onGoToStage}
        confirming={confirming}
        isConfirmable={isConfirmable}
      />
    ) : null,
  FINANCIAL_REPORTS: ({
    householdId,
    selectedYearMonth,
    confirming,
    isConfirmable,
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
      isConfirmable={isConfirmable}
      isGenerated={reportsPersisted ?? false}
    />
  ),
  CLOSE_PERIOD: ({ closeSummaryVM, confirming, isConfirmable, onClosePeriod }) =>
    closeSummaryVM ? (
      <CloseSummaryPanel
        summary={closeSummaryVM}
        onClose={onClosePeriod}
        confirming={confirming}
        isConfirmable={isConfirmable}
      />
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
  isConfirmable: boolean;
  /** The displayed stage's evidence list; workspace stages render it above the inputs. */
  evidence: CloseStageEvidence;
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
  /** Opens the securities/financing add-edit drawer (SECURITIES or FINANCING). */
  onOpenTradeDrawer: (kind: 'SECURITIES' | 'FINANCING', row?: TradeTableRow) => void;
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
  isConfirmable,
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
  onOpenTradeDrawer,
}) => {
  const confirmingDisplayed = confirmingStageId === displayedStageId;
  const confirmDisplayed = () => onConfirmStage(displayedStageId);

  switch (displayedStageId) {
    case 'ACCOUNT_BALANCE':
      return (
        <CloseAccountBalanceStage
          stepText={stepText}
          progressText={progressText}
          confirmedAtText={stage?.confirmedAtText ?? null}
          confirming={confirmingDisplayed}
          isReviewing={isReviewing}
          isConfirmable={isConfirmable}
          evidence={evidence}
          accounts={accounts}
          accountSnapshots={accountSnapshots}
          balances={accountBalances}
          setBalances={setAccountBalances}
          onConfirm={confirmDisplayed}
          onBackToCurrent={onBack}
        />
      );
    case 'SECURITIES_TRADE':
      return (
        <CloseSecuritiesTradeStage
          stepText={stepText}
          progressText={progressText}
          confirmedAtText={stage?.confirmedAtText ?? null}
          confirming={confirmingDisplayed}
          isReviewing={isReviewing}
          isConfirmable={isConfirmable}
          evidence={evidence}
          securities={securities}
          financing={financing}
          portfolios={portfolios}
          onOpenTradeDrawer={onOpenTradeDrawer}
          onConfirm={confirmDisplayed}
          onBackToCurrent={onBack}
        />
      );
    case 'PORTFOLIO_CASH_FLOW':
      return (
        <ClosePortfolioCashFlowStage
          stepText={stepText}
          progressText={progressText}
          confirmedAtText={stage?.confirmedAtText ?? null}
          confirming={confirmingDisplayed}
          isReviewing={isReviewing}
          isConfirmable={isConfirmable}
          evidence={evidence}
          portfolios={portfolios}
          portfolioSnapshots={portfolioSnapshots}
          cashFlows={portfolioCashFlows}
          setCashFlows={setPortfolioCashFlows}
          onConfirm={confirmDisplayed}
          onBackToCurrent={onBack}
        />
      );
    case 'DEBT_REPAYMENT':
      return (
        <CloseDebtRepaymentStage
          stepText={stepText}
          progressText={progressText}
          confirmedAtText={stage?.confirmedAtText ?? null}
          confirming={confirmingDisplayed}
          isReviewing={isReviewing}
          isConfirmable={isConfirmable}
          evidence={evidence}
          debtAccounts={debtSectionMetas}
          yearMonth={selectedYearMonth}
          repayments={repayments}
          setRepayments={setRepayments}
          onConfirm={confirmDisplayed}
          onBackToCurrent={onBack}
        />
      );
    case 'TRANSACTION_VALIDATION':
    case 'PROJECT_SETTLEMENT':
      return (
        <CloseEvidenceOnlyStage
          stepText={stepText}
          progressText={progressText}
          confirmedAtText={stage?.confirmedAtText ?? null}
          confirming={confirmingDisplayed}
          isReviewing={isReviewing}
          isConfirmable={isConfirmable}
          evidence={evidence}
          onConfirm={confirmDisplayed}
          onBackToCurrent={onBack}
        />
      );
    default:
      if (SPECIAL_STAGE_IDS.has(displayedStageId)) {
        return SPECIAL_PANELS[displayedStageId as SpecialStageId]({
          householdId,
          selectedYearMonth,
          confirming: confirmingDisplayed,
          isConfirmable,
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
      return null;
  }
};
