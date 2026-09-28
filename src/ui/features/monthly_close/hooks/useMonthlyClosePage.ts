import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { type Account } from '@/domains/account/types/account';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type CloseStageId } from '@/domains/financial_period/schemas';
import { type Portfolio } from '@/domains/portfolio/schemas';
import { type Project } from '@/domains/project/schemas';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useCloseSummaryVM } from '@/ui/features/monthly_close/hooks/useCloseSummaryVM';
import { useMonthlyClose } from '@/ui/features/monthly_close/hooks/useMonthlyClose';
import { useTradeDrawer } from '@/ui/features/monthly_close/hooks/useTradeDrawer';
import { useTradeDrawerForm } from '@/ui/features/monthly_close/hooks/useTradeDrawerForm';
import { resolveEvidenceForStage } from '@/ui/features/monthly_close/mappers/monthlyClose.mappers';
import {
  resolveDisplayedStageId,
  resolvePositionText,
  resolveStepText,
} from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import { useAccountBalanceStage } from '../stages/account_balance/hooks/useAccountBalanceStage';
import { useDebtRepaymentStage } from '../stages/debt_repayment/hooks/useDebtRepaymentStage';
import { useFinancialReportsStage } from '../stages/financial_reports/hooks/useFinancialReportsStage';
import { usePortfolioCashFlowStage } from '../stages/portfolio_cash_flow/hooks/usePortfolioCashFlowStage';
import { useProjectSettlementStage } from '../stages/project_settlement/hooks/useProjectSettlementStage';
import { useSecuritiesTradeStage } from '../stages/securities_trade/hooks/useSecuritiesTradeStage';
import type { CloseStageControl } from './closeStageControl';
import { useNoOpStageControl } from './useConfirmStageControl';

interface UseMonthlyClosePageArgs {
  householdId?: string;
  userEmail?: string;
}

/**
 * Owns MonthlyClosePage's data: the close workflow state, the entity lists the
 * stage inputs need, and the derived stage selection. Each stage's prefill and
 * draft state lives in its own stage controller (closeStageControl contract);
 * this hook orchestrates them behind one submit and the navigation callbacks.
 * The page keeps only layout and rendering.
 */
export const useMonthlyClosePage = ({
  householdId: householdIdProp,
  userEmail: userEmailProp,
}: UseMonthlyClosePageArgs) => {
  const { userProfile } = useAuthState();
  const householdId = householdIdProp ?? userProfile?.householdId ?? '';
  const userEmail = userEmailProp ?? userProfile?.email ?? '';
  const auth = useAuthIdentity();

  const {
    pageVM,
    selectedYearMonth,
    confirmingStageId,
    isStarting,
    error,
    anomalies,
    transactionIssues,
    cashFlowAdjustment,
    reportsPersisted,
    readiness,
    reportBundle,
    selectYearMonth,
    start,
    reopen,
    confirmStage,
    resetStagesFrom,
    refreshStageEvidence,
  } = useMonthlyClose({ householdId, userEmail });
  const [viewingStageId, setViewingStageId] = useState<CloseStageId | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);

  // Bumped after a relevant confirm so the stage hooks' display data and
  // prefill re-run against the confirm's writes (staleness fix).
  const [stageRefreshKey, setStageRefreshKey] = useState(0);
  const bumpStageRefreshKey = useCallback(() => setStageRefreshKey((key) => key + 1), []);

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
  const financialReportsStage = useFinancialReportsStage({
    householdId,
    confirmingStageId,
  });

  useEffect(() => {
    if (!householdId) return;
    let cancelled = false;

    const loadEntities = async () => {
      const [accountList, portfolioList, projectList, debtList] = await Promise.all([
        getAccountsUseCase.execute({ householdId, auth }),
        listPortfoliosUseCase.execute({ householdId, auth }),
        listProjectsUseCase.execute({ householdId }),
        listDebtAccountsUseCase.execute({ householdId }),
      ]);
      if (cancelled) return;
      setAccounts(accountList);
      setPortfolios(portfolioList);
      setProjects(projectList);
      setDebtAccounts(debtList);
    };

    void loadEntities();
    return () => {
      cancelled = true;
    };
  }, [auth, householdId]);

  useEffect(() => {
    if (!householdId || !selectedYearMonth) return;
    void refreshStageEvidence();
  }, [householdId, selectedYearMonth, refreshStageEvidence]);

  const currentStageId = pageVM.isClosed
    ? null
    : (pageVM.stages.find((stage) => !stage.isCompleted)?.stageId ?? null);
  const displayedStageId = resolveDisplayedStageId({
    isClosed: pageVM.isClosed,
    viewingStageId,
    currentStageId,
  });
  const displayedStage = pageVM.stages.find((stage) => stage.stageId === displayedStageId) ?? null;
  const isReviewing = displayedStageId !== null && displayedStageId !== currentStageId;

  const positionText = resolvePositionText(
    pageVM.stages,
    currentStageId,
    pageVM.isClosed,
    pageVM.totalCount,
  );
  const displayedStepText = resolveStepText(pageVM.stages, displayedStageId);

  // Every stage resolves through one strategy record keyed by stage ID, so the
  // submit path reads the per-stage payload, gate, and post-confirm effects
  // from one contract instead of branching on stage IDs.
  const debtRepaymentStage = useDebtRepaymentStage({
    householdId,
    selectedYearMonth,
    debtAccounts,
    auth,
    confirmingStageId,
    refreshKey: stageRefreshKey,
  });
  const projectSettlementStage = useProjectSettlementStage({
    householdId,
    selectedYearMonth,
    confirmingStageId,
    refreshKey: stageRefreshKey,
  });

  const evidenceFor = useCallback(
    (stageId: string) =>
      resolveEvidenceForStage(stageId, {
        anomalies,
        transactionIssues,
        cashFlowAdjustment,
        reportsPersisted,
        projectSettlements: projectSettlementStage.settlements,
      }),
    [anomalies, cashFlowAdjustment, projectSettlementStage, reportsPersisted, transactionIssues],
  );

  const transactionValidationStage = useNoOpStageControl(
    'TRANSACTION_VALIDATION',
    confirmingStageId,
  );
  const completenessCheckStage = useNoOpStageControl('COMPLETENESS_CHECK', confirmingStageId);
  const closePeriodStage = useNoOpStageControl('CLOSE_PERIOD', confirmingStageId);
  const stageControls = useMemo<Record<CloseStageId, CloseStageControl>>(
    () => ({
      ACCOUNT_BALANCE: accountBalanceStage,
      SECURITIES_TRADE: securitiesTradeStage,
      PORTFOLIO_CASH_FLOW: portfolioCashFlowStage,
      FINANCIAL_REPORTS: financialReportsStage,
      DEBT_REPAYMENT: debtRepaymentStage,
      TRANSACTION_VALIDATION: transactionValidationStage,
      PROJECT_SETTLEMENT: projectSettlementStage,
      COMPLETENESS_CHECK: completenessCheckStage,
      CLOSE_PERIOD: closePeriodStage,
    }),
    [
      accountBalanceStage,
      closePeriodStage,
      completenessCheckStage,
      debtRepaymentStage,
      financialReportsStage,
      portfolioCashFlowStage,
      projectSettlementStage,
      securitiesTradeStage,
      transactionValidationStage,
    ],
  );

  // Stage inputs are submitted with the selected month's confirmation, so a
  // month switch retires every stage draft through the strategy record; the
  // next month's tables then prefill.
  const handleSelectYearMonth = useCallback(
    (yearMonth: string) => {
      selectYearMonth(yearMonth);
      for (const control of Object.values(stageControls)) control.resetDraft();
    },
    [selectYearMonth, stageControls],
  );

  const handleConfirmStage = useCallback(
    async (stageId: CloseStageId) => {
      const control = stageControls[stageId];
      if (!control) return;
      if (control.shouldBlock()) return;
      if (control.confirmGate && !(await control.confirmGate())) return;
      const result = await confirmStage(control.buildRequest());
      if (result && !control.keepsViewOnConfirm) {
        setViewingStageId(null);
      }
      control.afterConfirm();
      bumpStageRefreshKey();
      await refreshStageEvidence();
    },
    [bumpStageRefreshKey, confirmStage, refreshStageEvidence, stageControls],
  );

  const drawer = useTradeDrawer({
    securities: securitiesTradeStage.securities,
    financing: securitiesTradeStage.financing,
    setSecurities: securitiesTradeStage.setSecurities,
    setFinancing: securitiesTradeStage.setFinancing,
    removedTransactionIds: securitiesTradeStage.removedTransactionIds,
    setRemovedTransactionIds: securitiesTradeStage.setRemovedTransactionIds,
    closeMonth: new Date(
      Number(selectedYearMonth.slice(0, 4)),
      Number(selectedYearMonth.slice(5, 7)) - 1,
      15,
    ),
  });

  const drawerForm = useTradeDrawerForm({
    isOpen: drawer.state.kind !== null,
    editRow: drawer.findRow(drawer.state.targetId),
    onDraftConfirm: drawer.confirmDraft,
  });

  const { readinessVM, financialResult, closeSummaryVM } = useCloseSummaryVM({
    householdId,
    selectedYearMonth,
    readiness,
    reportBundle,
    transactionIssues,
    securities: securitiesTradeStage.securities,
    anomalies,
    pageVM,
    reportsPersisted,
    refreshStageEvidence,
  });

  const handleGoToStage = useCallback((stageId: string) => {
    setViewingStageId(stageId as CloseStageId);
  }, []);

  const handleGoToStageWithReset = useCallback(
    async (stageId: string) => {
      handleGoToStage(stageId);
      await resetStagesFrom(stageId as CloseStageId);
      await refreshStageEvidence();
    },
    [handleGoToStage, refreshStageEvidence, resetStagesFrom],
  );

  const isWalkPositionStage = useCallback(
    (stageId: string) => (pageVM.isPaused ? stageId === currentStageId : stageId !== null),
    [currentStageId, pageVM.isPaused],
  );

  const handleClosePeriod = useCallback(async () => {
    await handleConfirmStage('CLOSE_PERIOD');
  }, [handleConfirmStage]);

  return {
    householdId,
    pageVM,
    selectedYearMonth,
    confirmingStageId,
    isStarting,
    error,
    viewingStageId,
    setViewingStageId,
    currentStageId,
    displayedStageId,
    displayedStage,
    isReviewing,
    positionText,
    displayedStepText,
    accounts,
    accountSnapshots: accountBalanceStage.accountSnapshots,
    portfolioSnapshots: portfolioCashFlowStage.portfolioSnapshots,
    reportsPersisted,
    portfolios,
    projects,
    debtAccounts,
    debtSectionMetas: debtRepaymentStage.debtSectionMetas,
    accountBalances: accountBalanceStage.balances,
    setAccountBalances: accountBalanceStage.setBalances,
    securities: securitiesTradeStage.securities,
    setSecurities: securitiesTradeStage.setSecurities,
    financing: securitiesTradeStage.financing,
    setFinancing: securitiesTradeStage.setFinancing,
    removedTransactionIds: securitiesTradeStage.removedTransactionIds,
    setRemovedTransactionIds: securitiesTradeStage.setRemovedTransactionIds,
    portfolioCashFlows: portfolioCashFlowStage.cashFlows,
    setPortfolioCashFlows: portfolioCashFlowStage.setCashFlows,
    repayments: debtRepaymentStage.repayments,
    setRepayments: debtRepaymentStage.setRepayments,
    selectYearMonth: handleSelectYearMonth,
    start,
    reopen,
    refreshStageEvidence,
    evidenceFor,
    handleConfirmStage,
    readinessVM,
    closeSummaryVM,
    financialResult,
    handleGoToStage,
    handleGoToStageWithReset,
    isWalkPositionStage,
    handleClosePeriod,
    drawer,
    drawerForm,
    accountBalanceStage,
    securitiesTradeStage,
    portfolioCashFlowStage,
  };
};
