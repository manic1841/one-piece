import React from 'react';

import { type Account } from '@/domains/account/types/account';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type CloseStageId } from '@/domains/financial_period/schemas';
import { type Portfolio } from '@/domains/portfolio/schemas';
import {
  type CloseSummaryVM,
  type ReadinessVM,
} from '@/ui/features/monthly_close/mappers/closeSummary.mappers';
import {
  NO_EVIDENCE,
  mapAdjustmentCountToEvidence,
  mapAnomaliesToEvidence,
  mapPersistenceToEvidence,
  mapProjectSettlementsToEvidence,
  mapTransactionIssuesToEvidence,
} from '@/ui/features/monthly_close/mappers/monthlyClose.mappers';
import type {
  AccountBalanceInput,
  AccountSnapshot,
} from '@/ui/features/monthly_close/viewmodels/accountBalance.vm';
import type { DebtSectionMetaVM } from '@/ui/features/monthly_close/viewmodels/debtPayment.vm';
import type {
  CloseStageEvidence,
  DebtRepaymentInput,
  FinancingInput,
  ProjectSettlementEvidenceRow,
  SecuritiesTradeInput,
} from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';
import type { PortfolioSnapshot } from '@/ui/features/monthly_close/viewmodels/portfolioCashFlow.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import { CloseEvidenceOnlyStage } from '../components/CloseEvidenceOnlyStage';
import { CloseFinancialReports } from '../components/CloseFinancialReports';
import { CloseReadinessCheck } from '../components/CloseReadinessCheck';
import { CloseSummaryPanel } from '../components/CloseSummaryPanel';
import type { TradeTableRow } from '../components/TradeTable';
import { type CloseStageControl } from '../hooks/closeStageControl';
import { useNoOpStageControl } from '../hooks/useConfirmStageControl';
import { CloseAccountBalanceStage } from '../stages/account_balance/components/CloseAccountBalanceStage';
import { useAccountBalanceStage } from '../stages/account_balance/hooks/useAccountBalanceStage';
import { CloseDebtRepaymentStage } from '../stages/debt_repayment/components/CloseDebtRepaymentStage';
import { useDebtRepaymentStage } from '../stages/debt_repayment/hooks/useDebtRepaymentStage';
import { useFinancialReportsStage } from '../stages/financial_reports/hooks/useFinancialReportsStage';
import { ClosePortfolioCashFlowStage } from '../stages/portfolio_cash_flow/components/ClosePortfolioCashFlowStage';
import { usePortfolioCashFlowStage } from '../stages/portfolio_cash_flow/hooks/usePortfolioCashFlowStage';
import { useProjectSettlementStage } from '../stages/project_settlement/hooks/useProjectSettlementStage';
import { CloseSecuritiesTradeStage } from '../stages/securities_trade/components/CloseSecuritiesTradeStage';
import { CloseTradeDrawerSection } from '../stages/securities_trade/components/CloseTradeDrawerSection';
import { useSecuritiesTradeStage } from '../stages/securities_trade/hooks/useSecuritiesTradeStage';

/** Raw evidence inputs the page loads once and shares by reference. */
export interface CloseStepEvidenceInputs {
  anomalies: Parameters<typeof mapAnomaliesToEvidence>[0];
  transactionIssues: Parameters<typeof mapTransactionIssuesToEvidence>[0];
  cashFlowAdjustment: number | null;
  reportsPersisted: boolean | null;
}

/**
 * Shared context every content factory receives at the page-to-registry
 * boundary; the factory maps it to the step component's narrow props.
 */
export interface CloseStepContext {
  householdId: string;
  selectedYearMonth: string;
  confirming: boolean;
  /** While paused, only the walk position's confirm button is enabled (ADR-0070). */
  isConfirmable: boolean;
  /** A closed or cascade-demoted period renders read-only: no confirm bar, no inputs. */
  isReadOnly: boolean;
  confirmedAtText: string | null;
  isReviewing: boolean;
  progressText: string;
  stepText: string;
  readinessVM: ReadinessVM | null;
  closeSummaryVM: CloseSummaryVM | null;
  /** True once the month's three reports are persisted; drives report badges. */
  reportsPersisted: boolean;
  accounts: Account[];
  accountSnapshots: Map<string, AccountSnapshot>;
  portfolioSnapshots: Map<string, PortfolioSnapshot | null>;
  portfolios: { id: string; name: string }[];
  projects: { id: string; name: string }[];
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
  onConfirm: () => void;
  onGoToStage: (stageId: string) => void;
  onConfirmStage: (stageId: string) => void;
  onClosePeriod: () => void;
  onContinue: () => void;
  onGenerate: () => void;
  onBack: () => void;
  /** Opens the securities/financing add-edit drawer (SECURITIES or FINANCING). */
  onOpenTradeDrawer: (kind: 'SECURITIES' | 'FINANCING', row?: TradeTableRow) => void;
}

/** The registry entry: control + content factory + evidence builder. */
export interface CloseStepDefinition {
  /** The stage controller the page dispatches on (closeStageControl contract). */
  control: CloseStageControl;
  /** Renders the step's content; a factory returns null when its data has not loaded. */
  render: (ctx: CloseStepContext, evidence: CloseStageEvidence) => React.ReactNode;
  /** Builds the stage's evidence from the page's raw inputs and settlement rows. */
  evidence: (
    inputs: CloseStepEvidenceInputs,
    projectSettlements: ProjectSettlementEvidenceRow[],
  ) => CloseStageEvidence;
}

interface UseCloseStepRegistryArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
  stageRefreshKey: number;
  accounts: Account[];
  portfolios: Portfolio[];
  debtAccounts: DebtAccount[];
}

/**
 * The unified step registry: the only file listing all nine close steps. It
 * calls the nine step hooks unconditionally (rules of hooks hold without
 * conditional dispatch) and returns `Record<CloseStageId, CloseStepDefinition>`
 * so TypeScript enforces every stage is registered. Adding a stage = one step
 * hook + one registry entry. The page hook consumes it for the submit path and
 * the month-switch reset; the page renders `registry[displayedStageId].render`.
 */
export const useCloseStepRegistry = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
  stageRefreshKey,
  accounts,
  portfolios,
  debtAccounts,
}: UseCloseStepRegistryArgs) => {
  const auth = useAuthIdentity();
  const accountBalanceStage = useAccountBalanceStage({
    householdId,
    selectedYearMonth,
    accounts,
    auth,
    confirmingStageId,
    refreshKey: stageRefreshKey,
  });
  const securitiesTradeStage = useSecuritiesTradeStage({
    householdId,
    selectedYearMonth,
    confirmingStageId,
  });
  const portfolioCashFlowStage = usePortfolioCashFlowStage({
    householdId,
    selectedYearMonth,
    portfolios,
    auth,
    confirmingStageId,
    refreshKey: stageRefreshKey,
  });
  const debtRepaymentStage = useDebtRepaymentStage({
    householdId,
    selectedYearMonth,
    debtAccounts,
    auth,
    confirmingStageId,
    refreshKey: stageRefreshKey,
  });
  const financialReportsStage = useFinancialReportsStage({
    householdId,
    confirmingStageId,
  });
  const projectSettlementStage = useProjectSettlementStage({
    householdId,
    selectedYearMonth,
    confirmingStageId,
    refreshKey: stageRefreshKey,
  });
  const transactionValidationStage = useNoOpStageControl(
    'TRANSACTION_VALIDATION',
    confirmingStageId,
  );
  const completenessCheckStage = useNoOpStageControl('COMPLETENESS_CHECK', confirmingStageId);
  const closePeriodStage = useNoOpStageControl('CLOSE_PERIOD', confirmingStageId);

  // Chrome props shared by every workspace-stage factory; each factory only
  // adds its own content props on top.
  const chromeProps = (ctx: CloseStepContext, evidence: CloseStageEvidence) => ({
    stepText: ctx.stepText,
    progressText: ctx.progressText,
    confirmedAtText: ctx.confirmedAtText,
    confirming: ctx.confirming,
    isReviewing: ctx.isReviewing,
    isConfirmable: ctx.isConfirmable,
    isReadOnly: ctx.isReadOnly,
    evidence,
  });

  return {
    ACCOUNT_BALANCE: {
      control: accountBalanceStage,
      render: (ctx, evidence) => (
        <CloseAccountBalanceStage
          {...chromeProps(ctx, evidence)}
          accounts={ctx.accounts}
          accountSnapshots={ctx.accountSnapshots}
          balances={ctx.accountBalances}
          setBalances={ctx.setAccountBalances}
          onConfirm={ctx.onConfirm}
          onBackToCurrent={ctx.onBack}
        />
      ),
      evidence: () => NO_EVIDENCE,
    },
    SECURITIES_TRADE: {
      control: securitiesTradeStage,
      render: (ctx, evidence) => (
        <>
          <CloseSecuritiesTradeStage
            {...chromeProps(ctx, evidence)}
            securities={ctx.securities}
            financing={ctx.financing}
            projects={ctx.projects}
            onOpenTradeDrawer={ctx.onOpenTradeDrawer}
            onConfirm={ctx.onConfirm}
            onBackToCurrent={ctx.onBack}
          />
          <CloseTradeDrawerSection
            kind={securitiesTradeStage.drawer.state.kind}
            mode={securitiesTradeStage.drawer.state.mode}
            form={securitiesTradeStage.drawerForm.form}
            projects={ctx.projects}
            submitting={securitiesTradeStage.confirming}
            onConfirm={securitiesTradeStage.drawerForm.submit}
            onCancel={securitiesTradeStage.drawer.close}
            onDelete={securitiesTradeStage.drawer.deleteRow}
          />
        </>
      ),
      evidence: () => NO_EVIDENCE,
    },
    PORTFOLIO_CASH_FLOW: {
      control: portfolioCashFlowStage,
      render: (ctx, evidence) => (
        <ClosePortfolioCashFlowStage
          {...chromeProps(ctx, evidence)}
          portfolios={ctx.portfolios}
          portfolioSnapshots={ctx.portfolioSnapshots}
          cashFlows={ctx.portfolioCashFlows}
          setCashFlows={ctx.setPortfolioCashFlows}
          onConfirm={ctx.onConfirm}
          onBackToCurrent={ctx.onBack}
        />
      ),
      evidence: () => NO_EVIDENCE,
    },
    PROJECT_SETTLEMENT: {
      control: projectSettlementStage,
      render: (ctx, evidence) => (
        <CloseEvidenceOnlyStage
          {...chromeProps(ctx, evidence)}
          onConfirm={ctx.onConfirm}
          onBackToCurrent={ctx.onBack}
        />
      ),
      evidence: (_inputs, projectSettlements) =>
        mapProjectSettlementsToEvidence(projectSettlements),
    },
    DEBT_REPAYMENT: {
      control: debtRepaymentStage,
      render: (ctx, evidence) => (
        <CloseDebtRepaymentStage
          {...chromeProps(ctx, evidence)}
          debtAccounts={ctx.debtSectionMetas}
          yearMonth={ctx.selectedYearMonth}
          repayments={ctx.repayments}
          setRepayments={ctx.setRepayments}
          onConfirm={ctx.onConfirm}
          onBackToCurrent={ctx.onBack}
        />
      ),
      evidence: () => NO_EVIDENCE,
    },
    TRANSACTION_VALIDATION: {
      control: transactionValidationStage,
      render: (ctx, evidence) => (
        <CloseEvidenceOnlyStage
          {...chromeProps(ctx, evidence)}
          onConfirm={ctx.onConfirm}
          onBackToCurrent={ctx.onBack}
        />
      ),
      evidence: (inputs) => mapTransactionIssuesToEvidence(inputs.transactionIssues),
    },
    COMPLETENESS_CHECK: {
      control: completenessCheckStage,
      render: (ctx) =>
        ctx.readinessVM ? (
          <CloseReadinessCheck
            readiness={ctx.readinessVM}
            onConfirm={() => ctx.onConfirmStage('COMPLETENESS_CHECK')}
            onGoToStage={ctx.onGoToStage}
            confirming={ctx.confirming}
            isConfirmable={ctx.isConfirmable}
            isReadOnly={ctx.isReadOnly}
          />
        ) : null,
      evidence: (inputs) => mapAnomaliesToEvidence(inputs.anomalies),
    },
    FINANCIAL_REPORTS: {
      control: financialReportsStage,
      render: (ctx) => (
        <CloseFinancialReports
          householdId={ctx.householdId}
          year={Number(ctx.selectedYearMonth.slice(0, 4))}
          month={Number(ctx.selectedYearMonth.slice(5, 7))}
          onContinue={ctx.onContinue}
          onGenerate={ctx.onGenerate}
          onBack={ctx.onBack}
          confirming={ctx.confirming}
          isConfirmable={ctx.isConfirmable}
          isGenerated={ctx.reportsPersisted}
        />
      ),
      evidence: (inputs) =>
        inputs.cashFlowAdjustment !== null
          ? mapAdjustmentCountToEvidence(inputs.cashFlowAdjustment)
          : NO_EVIDENCE,
    },
    CLOSE_PERIOD: {
      control: closePeriodStage,
      render: (ctx) =>
        ctx.closeSummaryVM ? (
          <CloseSummaryPanel
            summary={ctx.closeSummaryVM}
            onClose={ctx.onClosePeriod}
            confirming={ctx.confirming}
            isConfirmable={ctx.isConfirmable}
            isReadOnly={ctx.isReadOnly}
          />
        ) : null,
      evidence: (inputs) =>
        inputs.reportsPersisted !== null
          ? mapPersistenceToEvidence(inputs.reportsPersisted)
          : NO_EVIDENCE,
    },
  } satisfies Record<CloseStageId, CloseStepDefinition>;
};
