import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { type Account } from '@/domains/account/types/account';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type CloseStageId } from '@/domains/financial_period/schemas';
import { type Portfolio } from '@/domains/portfolio/schemas';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useCloseSummaryVM } from '@/ui/features/monthly_close/hooks/useCloseSummaryVM';
import { useDebtRepaymentPrefill } from '@/ui/features/monthly_close/hooks/useDebtRepaymentPrefill';
import { useMonthlyClose } from '@/ui/features/monthly_close/hooks/useMonthlyClose';
import { usePortfolioSnapshotPrefill } from '@/ui/features/monthly_close/hooks/usePortfolioSnapshotPrefill';
import { useReportLabelResolver } from '@/ui/features/monthly_close/hooks/useReportLabelResolver';
import { useSnapshotBalancePrefill } from '@/ui/features/monthly_close/hooks/useSnapshotBalancePrefill';
import { useTradeDrawer } from '@/ui/features/monthly_close/hooks/useTradeDrawer';
import { useTradeDrawerForm } from '@/ui/features/monthly_close/hooks/useTradeDrawerForm';
import { resolveEvidenceForStage } from '@/ui/features/monthly_close/mappers/monthlyClose.mappers';
import {
  resolveDisplayedStageId,
  resolvePositionText,
  resolveStepText,
} from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import type { CloseStageControl } from './closeStageControl';
import { useAccountBalanceStage } from './useAccountBalanceStage';
import { useFinancialReportsStage } from './useFinancialReportsStage';
import { usePortfolioCashFlowStage } from './usePortfolioCashFlowStage';
import { useSecuritiesTradeStage } from './useSecuritiesTradeStage';

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
    refreshStageEvidence,
  } = useMonthlyClose({ householdId, userEmail });
  const [viewingStageId, setViewingStageId] = useState<CloseStageId | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);

  const reportLabelResolver = useReportLabelResolver(householdId);
  const accountBalanceStage = useAccountBalanceStage({ confirmingStageId });
  const securitiesTradeStage = useSecuritiesTradeStage({
    householdId,
    selectedYearMonth,
    confirmingStageId,
  });
  const portfolioCashFlowStage = usePortfolioCashFlowStage({ confirmingStageId });
  const financialReportsStage = useFinancialReportsStage({
    confirmingStageId,
    labelResolver: reportLabelResolver,
  });

  const debtPrefill = useDebtRepaymentPrefill({
    householdId,
    selectedYearMonth,
    debtAccounts,
    auth,
  });
  const { repayments, setRepayments } = debtPrefill;

  // Stage inputs are submitted with the selected month's confirmation, so a
  // month switch must retire them; the next month's tables then prefill.
  const handleSelectYearMonth = useCallback(
    (yearMonth: string) => {
      selectYearMonth(yearMonth);
      accountBalanceStage.setBalances([]);
      securitiesTradeStage.setSecurities({ buys: [], sells: [] });
      securitiesTradeStage.setFinancing({ shareholderFinancing: [], dividendPayout: [] });
      securitiesTradeStage.setRemovedTransactionIds([]);
      portfolioCashFlowStage.setCashFlows({});
    },
    [accountBalanceStage, portfolioCashFlowStage, securitiesTradeStage, selectYearMonth],
  );

  useEffect(() => {
    if (!householdId) return;
    let cancelled = false;

    const loadEntities = async () => {
      const [accountList, portfolioList, debtList] = await Promise.all([
        getAccountsUseCase.execute({ householdId, auth }),
        listPortfoliosUseCase.execute({ householdId, auth }),
        listDebtAccountsUseCase.execute({ householdId }),
      ]);
      if (cancelled) return;
      setAccounts(accountList);
      setPortfolios(portfolioList);
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

  const accountSnapshots = useSnapshotBalancePrefill({
    householdId,
    selectedYearMonth,
    accounts,
    auth,
    setAccountBalances: accountBalanceStage.setBalances,
  });
  const portfolioSnapshots = usePortfolioSnapshotPrefill({
    householdId,
    selectedYearMonth,
    portfolios,
    auth,
  });

  const currentStageId = pageVM.isClosed
    ? null
    : (pageVM.stages.find((stage) => !stage.isCompleted)?.stageId ?? null);
  const displayedStageId = resolveDisplayedStageId({
    isClosed: pageVM.isClosed,
    isPaused: pageVM.isPaused,
    reviewSourceStageId: pageVM.reviewSourceStageId,
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

  const evidenceFor = useCallback(
    (stageId: string) =>
      resolveEvidenceForStage(stageId, {
        anomalies,
        transactionIssues,
        cashFlowAdjustment,
        reportsPersisted,
      }),
    [anomalies, cashFlowAdjustment, reportsPersisted, transactionIssues],
  );

  // Each stage resolves to its controller, so the submit path reads the
  // per-stage payload, gate, and post-confirm effects from one contract.
  const stageControls = useMemo<Record<string, CloseStageControl>>(
    () => ({
      ACCOUNT_BALANCE: accountBalanceStage,
      SECURITIES_TRADE: securitiesTradeStage,
      PORTFOLIO_CASH_FLOW: portfolioCashFlowStage,
      FINANCIAL_REPORTS: financialReportsStage,
      TRANSACTION_VALIDATION: {
        stageId: 'TRANSACTION_VALIDATION',
        confirming: confirmingStageId === 'TRANSACTION_VALIDATION',
        buildRequest: () => ({ stageId: 'TRANSACTION_VALIDATION' }),
        shouldBlock: () => false,
        afterConfirm: () => undefined,
      },
      PROJECT_SETTLEMENT: {
        stageId: 'PROJECT_SETTLEMENT',
        confirming: confirmingStageId === 'PROJECT_SETTLEMENT',
        buildRequest: () => ({ stageId: 'PROJECT_SETTLEMENT' }),
        shouldBlock: () => false,
        afterConfirm: () => undefined,
      },
      COMPLETENESS_CHECK: {
        stageId: 'COMPLETENESS_CHECK',
        confirming: confirmingStageId === 'COMPLETENESS_CHECK',
        buildRequest: () => ({ stageId: 'COMPLETENESS_CHECK' }),
        shouldBlock: () => false,
        afterConfirm: () => undefined,
      },
      CLOSE_PERIOD: {
        stageId: 'CLOSE_PERIOD',
        confirming: confirmingStageId === 'CLOSE_PERIOD',
        buildRequest: () => ({ stageId: 'CLOSE_PERIOD' }),
        shouldBlock: () => false,
        afterConfirm: () => undefined,
      },
      DEBT_REPAYMENT: {
        stageId: 'DEBT_REPAYMENT',
        confirming: confirmingStageId === 'DEBT_REPAYMENT',
        buildRequest: () => ({ stageId: 'DEBT_REPAYMENT', repayments }),
        shouldBlock: () => false,
        afterConfirm: () => undefined,
      },
    }),
    [
      accountBalanceStage,
      confirmingStageId,
      financialReportsStage,
      portfolioCashFlowStage,
      repayments,
      securitiesTradeStage,
    ],
  );

  const handleConfirmStage = useCallback(
    async (stageId: CloseStageId) => {
      const control = stageControls[stageId];
      if (!control) return;
      if (control.shouldBlock()) return;
      if (control.confirmGate && !(await control.confirmGate())) return;
      const result = await confirmStage(control.buildRequest());
      if (result && stageId !== 'FINANCIAL_REPORTS') {
        setViewingStageId(null);
      }
      control.afterConfirm();
      await refreshStageEvidence();
    },
    [confirmStage, refreshStageEvidence, stageControls],
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

  const handleClosePeriod = useCallback(async () => {
    await confirmStage({ stageId: 'CLOSE_PERIOD' });
    await refreshStageEvidence();
  }, [confirmStage, refreshStageEvidence]);

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
    accountSnapshots,
    portfolioSnapshots,
    reportsPersisted,
    portfolios,
    debtAccounts,
    debtSectionMetas: debtPrefill.debtSectionMetas,
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
    repayments,
    setRepayments,
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
    handleClosePeriod,
    drawer,
    drawerForm,
    accountBalanceStage,
    securitiesTradeStage,
    portfolioCashFlowStage,
  };
};
