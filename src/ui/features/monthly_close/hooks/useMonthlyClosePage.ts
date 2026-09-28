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
import {
  type CloseStepContext,
  useCloseStepRegistry,
} from '@/ui/features/monthly_close/hooks/useCloseStepRegistry';
import { useCloseSummaryVM } from '@/ui/features/monthly_close/hooks/useCloseSummaryVM';
import { useMonthlyClose } from '@/ui/features/monthly_close/hooks/useMonthlyClose';
import {
  resolveDisplayedStageId,
  resolvePositionText,
  resolveStepText,
} from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import { NO_EVIDENCE } from '../mappers/monthlyClose.mappers';

interface UseMonthlyClosePageArgs {
  householdId?: string;
  userEmail?: string;
}

/**
 * Owns MonthlyClosePage's workflow state: the close workflow, the entity lists
 * the steps share, and the derived stage selection. The nine step hooks run
 * inside the unified registry (useCloseStepRegistry), so this hook reads each
 * stage's control, content, and evidence from the registry record instead of
 * knowing any step's internals. The page keeps only layout and rendering.
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

  const stepRegistry = useCloseStepRegistry({
    householdId,
    selectedYearMonth,
    confirmingStageId,
    stageRefreshKey,
    accounts,
    portfolios,
    debtAccounts,
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

  const evidenceFor = useCallback(
    (stageId: string) => {
      const step = stepRegistry[stageId as CloseStageId];
      if (!step) return NO_EVIDENCE;
      return step.evidence(
        { anomalies, transactionIssues, cashFlowAdjustment, reportsPersisted },
        stepRegistry.PROJECT_SETTLEMENT.control.settlements,
      );
    },
    [anomalies, cashFlowAdjustment, reportsPersisted, stepRegistry, transactionIssues],
  );

  // Stage inputs are submitted with the selected month's confirmation, so a
  // month switch retires every stage draft through the registry; the next
  // month's tables then prefill.
  const handleSelectYearMonth = useCallback(
    (yearMonth: string) => {
      selectYearMonth(yearMonth);
      for (const step of Object.values(stepRegistry)) step.control.resetDraft();
    },
    [selectYearMonth, stepRegistry],
  );

  const handleConfirmStage = useCallback(
    async (stageId: CloseStageId) => {
      const step = stepRegistry[stageId];
      if (!step) return;
      const { control } = step;
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
    [bumpStageRefreshKey, confirmStage, refreshStageEvidence, stepRegistry],
  );

  const securitiesStage = stepRegistry.SECURITIES_TRADE;
  const drawer = securitiesStage.control.drawer;
  const drawerForm = securitiesStage.control.drawerForm;

  const { readinessVM, closeSummaryVM } = useCloseSummaryVM({
    householdId,
    selectedYearMonth,
    readiness,
    reportBundle,
    transactionIssues,
    securities: securitiesStage.control.securities,
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

  const stageContext = useMemo<CloseStepContext>(
    () => ({
      householdId,
      selectedYearMonth,
      confirming: displayedStage ? confirmingStageId === displayedStage.stageId : false,
      isConfirmable: displayedStage ? isWalkPositionStage(displayedStage.stageId) : false,
      confirmedAtText: displayedStage?.confirmedAtText ?? null,
      isReviewing,
      progressText: positionText,
      stepText: displayedStepText ?? positionText,
      readinessVM,
      closeSummaryVM,
      reportsPersisted: reportsPersisted ?? false,
      accounts,
      accountSnapshots: stepRegistry.ACCOUNT_BALANCE.control.accountSnapshots,
      portfolioSnapshots: stepRegistry.PORTFOLIO_CASH_FLOW.control.portfolioSnapshots,
      portfolios: portfolios.map((portfolio) => ({ id: portfolio.id, name: portfolio.name })),
      projects: projects.map((project) => ({ id: project.id, name: project.name })),
      debtSectionMetas: stepRegistry.DEBT_REPAYMENT.control.debtSectionMetas,
      accountBalances: stepRegistry.ACCOUNT_BALANCE.control.balances,
      setAccountBalances: stepRegistry.ACCOUNT_BALANCE.control.setBalances,
      securities: securitiesStage.control.securities,
      financing: securitiesStage.control.financing,
      portfolioCashFlows: stepRegistry.PORTFOLIO_CASH_FLOW.control.cashFlows,
      setPortfolioCashFlows: stepRegistry.PORTFOLIO_CASH_FLOW.control.setCashFlows,
      repayments: stepRegistry.DEBT_REPAYMENT.control.repayments,
      setRepayments: stepRegistry.DEBT_REPAYMENT.control.setRepayments,
      onConfirm: () => {
        if (displayedStage) void handleConfirmStage(displayedStage.stageId);
      },
      onGoToStage: handleGoToStage,
      onConfirmStage: (stageId) => void handleConfirmStage(stageId as CloseStageId),
      onClosePeriod: () => void handleClosePeriod(),
      onContinue: () => setViewingStageId('CLOSE_PERIOD'),
      onGenerate: () => {
        void handleConfirmStage('FINANCIAL_REPORTS');
      },
      onBack: () => setViewingStageId(null),
      onOpenTradeDrawer: (kind, row) => drawer.open(kind, row ? 'EDIT' : 'ADD', row),
    }),
    [
      accounts,
      closeSummaryVM,
      confirmingStageId,
      displayedStage,
      displayedStepText,
      drawer,
      handleConfirmStage,
      handleClosePeriod,
      handleGoToStage,
      householdId,
      reportsPersisted,
      isReviewing,
      isWalkPositionStage,
      portfolios,
      positionText,
      projects,
      readinessVM,
      selectedYearMonth,
      securitiesStage,
      stepRegistry,
    ],
  );

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
    stepRegistry,
    stageContext,
    evidenceFor,
    selectYearMonth: handleSelectYearMonth,
    start,
    reopen,
    refreshStageEvidence,
    handleConfirmStage,
    readinessVM,
    closeSummaryVM,
    handleGoToStage,
    handleGoToStageWithReset,
    isWalkPositionStage,
    handleClosePeriod,
    drawer,
    drawerForm,
  };
};
