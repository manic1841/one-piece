import React from 'react';

import { type Account } from '@/domains/account/types/account';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type CloseStageId } from '@/domains/financial_period/schemas';
import { type Portfolio } from '@/domains/portfolio/schemas';
import {
  NO_EVIDENCE,
  mapAdjustmentCountToEvidence,
  mapAnomaliesToEvidence,
  mapPersistenceToEvidence,
  mapProjectSettlementsToEvidence,
  mapTransactionIssuesToEvidence,
} from '@/ui/features/monthly_close/mappers/monthlyClose.mappers';
import type { CloseStageEvidence } from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import { CloseEvidenceOnlyStage } from '../components/CloseEvidenceOnlyStage';
import { CloseStageLoadError } from '../components/CloseStageLoadError';
import { type CloseStageControl } from '../hooks/closeStageControl';
import { useCloseSummaryVM } from '../hooks/useCloseSummaryVM';
import { CloseAccountBalanceStage } from '../stages/account_balance/components/CloseAccountBalanceStage';
import { useAccountBalanceStage } from '../stages/account_balance/hooks/useAccountBalanceStage';
import { CloseSummaryPanel } from '../stages/close_period/components/CloseSummaryPanel';
import { useClosePeriodStage } from '../stages/close_period/hooks/useClosePeriodStage';
import { CloseReadinessCheck } from '../stages/completeness_check/components/CloseReadinessCheck';
import { useCompletenessCheckStage } from '../stages/completeness_check/hooks/useCompletenessCheckStage';
import { CloseDebtRepaymentStage } from '../stages/debt_repayment/components/CloseDebtRepaymentStage';
import { useDebtRepaymentStage } from '../stages/debt_repayment/hooks/useDebtRepaymentStage';
import { CloseFinancialReports } from '../stages/financial_reports/components/CloseFinancialReports';
import { useFinancialReportsStage } from '../stages/financial_reports/hooks/useFinancialReportsStage';
import { ClosePortfolioCashFlowStage } from '../stages/portfolio_cash_flow/components/ClosePortfolioCashFlowStage';
import { usePortfolioCashFlowStage } from '../stages/portfolio_cash_flow/hooks/usePortfolioCashFlowStage';
import { useProjectSettlementStage } from '../stages/project_settlement/hooks/useProjectSettlementStage';
import { CloseSecuritiesTradeStage } from '../stages/securities_trade/components/CloseSecuritiesTradeStage';
import { CloseTradeDrawerSection } from '../stages/securities_trade/components/CloseTradeDrawerSection';
import { useSecuritiesTradeStage } from '../stages/securities_trade/hooks/useSecuritiesTradeStage';
import { useTransactionValidationStage } from '../stages/transaction_validation/hooks/useTransactionValidationStage';
import { type MonthlyClosePageVM } from '../viewmodels/monthlyClose.vm';

/**
 * Shared context every content factory receives at the page-to-registry
 * boundary. It carries only chrome, navigation commands, and shared entities;
 * every stage-owned value (drafts, prefill data, drawers, summary VMs) is read
 * from the owning stage hook inside the registry instead of round-tripping
 * through the page.
 */
export interface CloseStepContext {
  /** Chrome: the frame every stage shares. */
  stepText: string;
  progressText: string;
  confirmedAtText: string | null;
  confirming: boolean;
  /** While paused, only the walk position's confirm button is enabled (ADR-0070). */
  isConfirmable: boolean;
  /** A closed or cascade-demoted period renders read-only: no confirm bar, no inputs. */
  isReadOnly: boolean;
  isReviewing: boolean;
  /** Navigation commands: the page owns where the walk goes, stages only ask. */
  onConfirm: () => void;
  onGoToStage: (stageId: string) => void;
  onContinue: () => void;
  onBack: () => void;
  /** Entities the steps share: the page loads them once, the registry hands them out. */
  accounts: Account[];
  portfolios: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}

/** The registry entry: control + content factory + evidence builder. */
export interface CloseStepDefinition {
  /** The stage controller the page dispatches on (closeStageControl contract). */
  control: CloseStageControl;
  /** Renders the step's content; a factory returns null when its data has not loaded. */
  render: (ctx: CloseStepContext) => React.ReactNode;
  /**
   * Builds the stage's evidence from the shared inputs and the owning stage's
   * data. The registry is the only place allowed to read across stages.
   */
  evidence: () => CloseStageEvidence;
}

export interface UseCloseStepRegistryArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
  refreshKey: number;
  accounts: Account[];
  portfolios: Portfolio[];
  debtAccounts: DebtAccount[];
  pageVM: MonthlyClosePageVM;
}

/**
 * The unified step registry: the only file listing all nine close steps and the
 * only place allowed to read across stages. It calls the nine step hooks
 * unconditionally (rules of hooks hold without conditional dispatch) and returns
 * `Record<CloseStageId, CloseStepDefinition>` so TypeScript enforces every stage
 * is registered. Adding a stage = one step hook + one registry entry. Each
 * definition reads its own stage hook directly and builds its evidence in a
 * zero-arg closure; the page passes only chrome, navigation, and shared
 * entities through `CloseStepContext`.
 */
export const useCloseStepRegistry = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
  refreshKey,
  accounts,
  portfolios,
  debtAccounts,
  pageVM,
}: UseCloseStepRegistryArgs) => {
  const auth = useAuthIdentity();
  const accountBalanceStage = useAccountBalanceStage({
    householdId,
    selectedYearMonth,
    accounts,
    auth,
    confirmingStageId,
    refreshKey,
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
    refreshKey,
  });
  const debtRepaymentStage = useDebtRepaymentStage({
    householdId,
    selectedYearMonth,
    debtAccounts,
    auth,
    confirmingStageId,
    refreshKey,
  });
  const projectSettlementStage = useProjectSettlementStage({
    householdId,
    selectedYearMonth,
    confirmingStageId,
    refreshKey,
  });
  const transactionValidationStage = useTransactionValidationStage({
    householdId,
    selectedYearMonth,
    confirmingStageId,
  });
  const completenessCheckStage = useCompletenessCheckStage({
    householdId,
    selectedYearMonth,
    confirmingStageId,
  });
  const closePeriodStage = useClosePeriodStage({
    householdId,
    selectedYearMonth,
    confirmingStageId,
  });
  const financialReportsStage = useFinancialReportsStage({
    householdId,
    selectedYearMonth,
    confirmingStageId,
    persistedBundle: closePeriodStage.persistedBundle,
    isClosed: pageVM.isClosed,
  });

  // Steps 7-8 summary VMs: built here, after the stage hooks, so COMPLETENESS_CHECK
  // and CLOSE_PERIOD read them from this closure instead of the page copying them
  // into CloseStepContext. The readiness COMPLETENESS_CHECK owns is also the
  // single source Step 8's Generate gate reads across stages; CLOSE_PERIOD's
  // five financial figures come from the preview bundle its own stage hook owns.
  const { readinessVM, closeSummaryVM } = useCloseSummaryVM({
    readiness: completenessCheckStage.readiness,
    checkedCount: transactionValidationStage.checkedCount,
    reportBundle: closePeriodStage.reportBundle,
    persistedBundle: closePeriodStage.persistedBundle,
    isClosed: pageVM.isClosed,
    transactionIssues: transactionValidationStage.transactionIssues,
    securities: securitiesTradeStage.securities,
    anomalies: completenessCheckStage.anomalies,
    pageVM,
    reportsPersisted: financialReportsStage.reportsPersisted,
  });

  // Per-stage evidence closures: built from the owning stage's data. CLOSE_PERIOD
  // reads the persistence state owned by FINANCIAL_REPORTS; FINANCIAL_REPORTS
  // reads the preview bundle owned by CLOSE_PERIOD — the intentional cross-stage
  // reads, permitted only here.
  const noEvidence = () => NO_EVIDENCE;
  const projectSettlementEvidence = () =>
    mapProjectSettlementsToEvidence(projectSettlementStage.settlements);
  const transactionValidationEvidence = () =>
    mapTransactionIssuesToEvidence(transactionValidationStage.transactionIssues);
  const completenessCheckEvidence = () => mapAnomaliesToEvidence(completenessCheckStage.anomalies);
  const financialReportsEvidence = () => {
    const adjustment = closePeriodStage.reportBundle?.cashFlow.adjustment ?? null;
    return adjustment !== null ? mapAdjustmentCountToEvidence(adjustment) : NO_EVIDENCE;
  };
  const closePeriodEvidence = () =>
    financialReportsStage.reportsPersisted !== null
      ? mapPersistenceToEvidence(financialReportsStage.reportsPersisted)
      : NO_EVIDENCE;

  // The FINANCIAL_REPORTS action is driven by the stage's own completion, not
  // report persistence: a legacy or reopened month may carry leftover persisted
  // reports while the stage is still PENDING (#222).
  const isFinancialReportsCompleted =
    pageVM.stages.find((stage) => stage.stageId === 'FINANCIAL_REPORTS')?.isCompleted ?? false;

  // Chrome props shared by every workspace-stage factory; each factory only
  // adds its own content props on top. chromeProps calls the evidence closure
  // itself, so render factories no longer receive evidence as a second argument.
  const chromeProps = (ctx: CloseStepContext, evidence: () => CloseStageEvidence) => ({
    stepText: ctx.stepText,
    progressText: ctx.progressText,
    confirmedAtText: ctx.confirmedAtText,
    confirming: ctx.confirming,
    isReviewing: ctx.isReviewing,
    isConfirmable: ctx.isConfirmable,
    isReadOnly: ctx.isReadOnly,
    evidence: evidence(),
  });

  return {
    ACCOUNT_BALANCE: {
      control: accountBalanceStage,
      render: (ctx) => (
        <CloseAccountBalanceStage
          {...chromeProps(ctx, noEvidence)}
          accounts={ctx.accounts}
          accountSnapshots={accountBalanceStage.accountSnapshots}
          balances={accountBalanceStage.balances}
          setBalances={accountBalanceStage.setBalances}
          onConfirm={ctx.onConfirm}
          onBackToCurrent={ctx.onBack}
        />
      ),
      evidence: noEvidence,
    },
    SECURITIES_TRADE: {
      control: securitiesTradeStage,
      render: (ctx) => (
        <>
          <CloseSecuritiesTradeStage
            {...chromeProps(ctx, noEvidence)}
            securities={securitiesTradeStage.securities}
            financing={securitiesTradeStage.financing}
            projects={ctx.projects}
            onOpenTradeDrawer={(kind, row) =>
              securitiesTradeStage.drawer.open(kind, row ? 'EDIT' : 'ADD', row)
            }
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
      evidence: noEvidence,
    },
    PORTFOLIO_CASH_FLOW: {
      control: portfolioCashFlowStage,
      render: (ctx) => (
        <ClosePortfolioCashFlowStage
          {...chromeProps(ctx, noEvidence)}
          portfolios={ctx.portfolios}
          portfolioSnapshots={portfolioCashFlowStage.portfolioSnapshots}
          cashFlows={portfolioCashFlowStage.cashFlows}
          setCashFlows={portfolioCashFlowStage.setCashFlows}
          onConfirm={ctx.onConfirm}
          onBackToCurrent={ctx.onBack}
        />
      ),
      evidence: noEvidence,
    },
    PROJECT_SETTLEMENT: {
      control: projectSettlementStage,
      render: (ctx) => (
        <CloseEvidenceOnlyStage
          {...chromeProps(ctx, projectSettlementEvidence)}
          onConfirm={ctx.onConfirm}
          onBackToCurrent={ctx.onBack}
        />
      ),
      evidence: projectSettlementEvidence,
    },
    DEBT_REPAYMENT: {
      control: debtRepaymentStage,
      render: (ctx) => (
        <CloseDebtRepaymentStage
          {...chromeProps(ctx, noEvidence)}
          debtAccounts={debtRepaymentStage.debtSectionMetas}
          yearMonth={selectedYearMonth}
          repayments={debtRepaymentStage.repayments}
          setRepayments={debtRepaymentStage.setRepayments}
          onConfirm={ctx.onConfirm}
          onBackToCurrent={ctx.onBack}
        />
      ),
      evidence: noEvidence,
    },
    TRANSACTION_VALIDATION: {
      control: transactionValidationStage,
      render: (ctx) => (
        <CloseEvidenceOnlyStage
          {...chromeProps(ctx, transactionValidationEvidence)}
          loadErrorMessage={transactionValidationStage.errorMessage}
          onConfirm={ctx.onConfirm}
          onBackToCurrent={ctx.onBack}
        />
      ),
      evidence: transactionValidationEvidence,
    },
    COMPLETENESS_CHECK: {
      control: completenessCheckStage,
      render: (ctx) =>
        readinessVM ? (
          <CloseReadinessCheck
            readiness={readinessVM}
            errorMessage={completenessCheckStage.errorMessage}
            onConfirm={ctx.onConfirm}
            onGoToStage={ctx.onGoToStage}
            confirming={ctx.confirming}
            isConfirmable={ctx.isConfirmable}
            isReadOnly={ctx.isReadOnly}
          />
        ) : (
          // Step 7 needs readiness to render at all, so a failed load would
          // otherwise leave the stage blank and look like a clean month.
          <CloseStageLoadError message={completenessCheckStage.errorMessage} />
        ),
      evidence: completenessCheckEvidence,
    },
    FINANCIAL_REPORTS: {
      control: financialReportsStage,
      render: (ctx) => (
        <CloseFinancialReports
          reports={financialReportsStage.reports}
          timestamps={financialReportsStage.timestamps}
          isLoading={financialReportsStage.isLoading}
          error={financialReportsStage.error}
          isSettlementReady={completenessCheckStage.readiness?.isReady ?? null}
          onContinue={ctx.onContinue}
          onGenerate={ctx.onConfirm}
          onBack={ctx.onBack}
          confirming={ctx.confirming}
          isConfirmable={ctx.isConfirmable}
          isReadOnly={ctx.isReadOnly}
          isStageCompleted={isFinancialReportsCompleted}
          hasPersistedReports={financialReportsStage.reportsPersisted ?? false}
        />
      ),
      evidence: financialReportsEvidence,
    },
    CLOSE_PERIOD: {
      control: closePeriodStage,
      render: (ctx) =>
        closeSummaryVM ? (
          <CloseSummaryPanel
            summary={closeSummaryVM}
            onClose={ctx.onConfirm}
            confirming={ctx.confirming}
            isConfirmable={ctx.isConfirmable}
            isReadOnly={ctx.isReadOnly}
          />
        ) : null,
      evidence: closePeriodEvidence,
    },
  } satisfies Record<CloseStageId, CloseStepDefinition>;
};
