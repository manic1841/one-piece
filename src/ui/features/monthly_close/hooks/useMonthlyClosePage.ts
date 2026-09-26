import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { getMonthInvestmentFinancingUseCase } from '@/application/monthly_close/use_cases/getMonthInvestmentFinancingUseCase';
import {
  type AccountBalanceInput,
  type FinancingInput,
  type SecuritiesTradeInput,
} from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { type Account } from '@/domains/account/types/account';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type CloseStageId } from '@/domains/financial_period/schemas';
import { type Portfolio } from '@/domains/portfolio/schemas';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';
import { useDebtRepaymentPrefill } from '@/ui/features/monthly_close/hooks/useDebtRepaymentPrefill';
import { useMonthlyClose } from '@/ui/features/monthly_close/hooks/useMonthlyClose';
import { usePortfolioSnapshotPrefill } from '@/ui/features/monthly_close/hooks/usePortfolioSnapshotPrefill';
import { useReportLabelResolver } from '@/ui/features/monthly_close/hooks/useReportLabelResolver';
import { useSnapshotBalancePrefill } from '@/ui/features/monthly_close/hooks/useSnapshotBalancePrefill';
import { useTradeDrawer } from '@/ui/features/monthly_close/hooks/useTradeDrawer';
import { useTradeDrawerForm } from '@/ui/features/monthly_close/hooks/useTradeDrawerForm';
import {
  mapCloseSummary,
  mapReadinessVM,
} from '@/ui/features/monthly_close/mappers/closeSummary.mappers';
import {
  NO_EVIDENCE,
  mapAdjustmentCountToEvidence,
  mapAnomaliesToEvidence,
  mapPersistenceToEvidence,
  mapTransactionIssuesToEvidence,
} from '@/ui/features/monthly_close/mappers/monthlyClose.mappers';
import {
  type CloseStageEvidence,
  resolveDisplayedStageId,
  resolvePositionText,
  resolveStepText,
} from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

interface UseMonthlyClosePageArgs {
  householdId?: string;
  userEmail?: string;
}

/**
 * Owns MonthlyClosePage's data: the close workflow state, the entity lists the
 * stage inputs need, every stage input in progress, and the derived stage
 * selection. The page keeps only layout and rendering.
 */
const toTradeRow = (transaction: {
  id: string;
  amount?: number | null;
  date: Date;
  description?: string | null;
  projectId?: string | null;
}) => ({
  transactionId: transaction.id,
  amount: transaction.amount ?? 0,
  date: transaction.date,
  description: transaction.description ?? undefined,
  projectId: transaction.projectId,
});

export const useMonthlyClosePage = ({
  householdId: householdIdProp,
  userEmail: userEmailProp,
}: UseMonthlyClosePageArgs) => {
  const { userProfile } = useAuthState();
  const householdId = householdIdProp ?? userProfile?.householdId ?? '';
  const userEmail = userEmailProp ?? userProfile?.email ?? '';
  const auth = useAuthIdentity();
  const { confirm: confirmDialog } = useConfirm();

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
  const [accountBalances, setAccountBalances] = useState<AccountBalanceInput[]>([]);
  const [securities, setSecurities] = useState<{
    buys: SecuritiesTradeInput[];
    sells: SecuritiesTradeInput[];
  }>({ buys: [], sells: [] });
  const [financing, setFinancing] = useState<{
    shareholderFinancing: FinancingInput[];
    dividendPayout: FinancingInput[];
  }>({ shareholderFinancing: [], dividendPayout: [] });
  const [removedTransactionIds, setRemovedTransactionIds] = useState<string[]>([]);
  // Bumped after a successful SECURITIES_TRADE confirm so the month-transaction
  // prefill re-runs and local rows pick up their Firestore document IDs.
  const [tradeRefreshKey, setTradeRefreshKey] = useState(0);
  const [portfolioCashFlows, setPortfolioCashFlows] = useState<
    Record<string, { deposits: number; withdrawals: number }>
  >({});
  const debtPrefill = useDebtRepaymentPrefill({
    householdId,
    selectedYearMonth,
    debtAccounts,
    auth,
  });
  const { repayments, setRepayments } = debtPrefill;
  const reportLabelResolver = useReportLabelResolver(householdId);

  // Stage inputs are submitted with the selected month's confirmation, so a
  // month switch must retire them; the next month's tables then prefill.
  const handleSelectYearMonth = useCallback(
    (yearMonth: string) => {
      selectYearMonth(yearMonth);
      setAccountBalances([]);
      setSecurities({ buys: [], sells: [] });
      setFinancing({ shareholderFinancing: [], dividendPayout: [] });
      setRemovedTransactionIds([]);
      setPortfolioCashFlows({});
    },
    [selectYearMonth],
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
    setAccountBalances,
  });
  const portfolioSnapshots = usePortfolioSnapshotPrefill({
    householdId,
    selectedYearMonth,
    portfolios,
    auth,
  });

  // SECURITIES_TRADE prefill: the month's existing investment and financing
  // transactions become editable rows carrying their transaction IDs, so the
  // confirmation diff-merges instead of duplicating (ADR-0052 revision).
  useEffect(() => {
    if (!householdId || !selectedYearMonth) return;
    let cancelled = false;

    const loadMonthTransactions = async () => {
      const rows = await getMonthInvestmentFinancingUseCase.execute({
        householdId,
        year: Number(selectedYearMonth.slice(0, 4)),
        month: Number(selectedYearMonth.slice(5, 7)),
      });
      if (cancelled) return;
      setSecurities({
        buys: rows.buys.map(toTradeRow),
        sells: rows.sells.map(toTradeRow),
      });
      setFinancing({
        shareholderFinancing: rows.shareholderFinancing.map(toTradeRow),
        dividendPayout: rows.dividendPayout.map(toTradeRow),
      });
      setRemovedTransactionIds([]);
    };

    void loadMonthTransactions();
    return () => {
      cancelled = true;
    };
  }, [householdId, selectedYearMonth, tradeRefreshKey]);

  useEffect(() => {
    if (!householdId || !selectedYearMonth) return;
    void refreshStageEvidence();
  }, [householdId, selectedYearMonth, refreshStageEvidence]);

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
    (stageId: string): CloseStageEvidence => {
      switch (stageId) {
        case 'TRANSACTION_VALIDATION':
          return mapTransactionIssuesToEvidence(transactionIssues);
        case 'COMPLETENESS_CHECK':
          return mapAnomaliesToEvidence(anomalies);
        case 'FINANCIAL_REPORTS':
          return cashFlowAdjustment !== null
            ? mapAdjustmentCountToEvidence(cashFlowAdjustment)
            : NO_EVIDENCE;
        case 'CLOSE_PERIOD':
          return reportsPersisted !== null
            ? mapPersistenceToEvidence(reportsPersisted)
            : NO_EVIDENCE;
        default:
          return NO_EVIDENCE;
      }
    },
    [anomalies, cashFlowAdjustment, reportsPersisted, transactionIssues],
  );

  const handleConfirmStage = useCallback(
    async (stageId: CloseStageId) => {
      const result = await confirmStage({
        stageId,
        accountBalances: stageId === 'ACCOUNT_BALANCE' ? accountBalances : undefined,
        securities: stageId === 'SECURITIES_TRADE' ? securities : undefined,
        financing: stageId === 'SECURITIES_TRADE' ? financing : undefined,
        removedTransactionIds: stageId === 'SECURITIES_TRADE' ? removedTransactionIds : undefined,
        portfolioCashFlows: stageId === 'PORTFOLIO_CASH_FLOW' ? portfolioCashFlows : undefined,
        repayments: stageId === 'DEBT_REPAYMENT' ? repayments : undefined,
        labelResolver: stageId === 'FINANCIAL_REPORTS' ? reportLabelResolver : undefined,
      });
      if (result && stageId !== 'FINANCIAL_REPORTS') {
        setViewingStageId(null);
      }
      if (stageId === 'SECURITIES_TRADE') {
        setTradeRefreshKey((key) => key + 1);
      }
      await refreshStageEvidence();
    },
    [
      accountBalances,
      confirmStage,
      financing,
      portfolioCashFlows,
      refreshStageEvidence,
      removedTransactionIds,
      repayments,
      reportLabelResolver,
      securities,
    ],
  );

  const handleConfirmStageWithWarning = useCallback(
    async (stageId: CloseStageId) => {
      const hasSecurities = securities.buys.length > 0 || securities.sells.length > 0;
      const hasFinancing =
        financing.shareholderFinancing.length > 0 || financing.dividendPayout.length > 0;
      const needsWarning = stageId === 'SECURITIES_TRADE' && !hasSecurities && !hasFinancing;
      if (needsWarning) {
        const confirmed = await confirmDialog({
          title: MONTHLY_CLOSE_LABELS.EMPTY_STAGE_WARNING_TITLE,
          context: MONTHLY_CLOSE_LABELS.EMPTY_STAGE_WARNING_CONTEXT,
          consequence: MONTHLY_CLOSE_LABELS.EMPTY_STAGE_WARNING_CONSEQUENCE,
          confirmLabel: MONTHLY_CLOSE_LABELS.RECONFIRM_ACTION,
          cancelLabel: MONTHLY_CLOSE_LABELS.CANCEL,
        });
        if (!confirmed) return;
      }
      await handleConfirmStage(stageId);
    },
    [confirmDialog, financing, handleConfirmStage, securities],
  );

  const drawer = useTradeDrawer({
    securities,
    financing,
    setSecurities,
    setFinancing,
    removedTransactionIds,
    setRemovedTransactionIds,
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

  const zeroActivityNames = anomalies.map((activity) => activity.name);
  const [checkedCount, setCheckedCount] = useState(0);

  // Checked count rides the same refresh as the stage evidence, so Step 7's
  // N/M count never goes stale after a mid-close securities re-confirm.
  useEffect(() => {
    if (!householdId || !selectedYearMonth) return;
    const refresh = async () => {
      const result = await validateMonthTransactionsUseCase.execute({
        householdId,
        year: Number(selectedYearMonth.slice(0, 4)),
        month: Number(selectedYearMonth.slice(5, 7)),
        auth,
      });
      setCheckedCount(result.checkedCount);
    };
    void refresh();
  }, [auth, householdId, refreshStageEvidence, selectedYearMonth]);

  const readinessVM = useMemo(() => {
    if (!readiness) return null;
    return mapReadinessVM({
      totalAccounts: readiness.totalAccounts,
      confirmedAccounts: readiness.totalAccounts - readiness.unsettledAccounts.length,
      totalTransactions: checkedCount,
      transactionIssues,
      totalSecurities: securities.buys.length + securities.sells.length,
      totalPortfolios: readiness.totalPortfolios,
      confirmedPortfolios: readiness.totalPortfolios - readiness.unsettledPortfolios.length,
      totalProjects: readiness.totalProjects,
      confirmedProjects: readiness.totalProjects - readiness.unsettledProjects.length,
      totalDebts: readiness.totalDebts,
      confirmedDebts: readiness.totalDebts - readiness.unsettledDebts.length,
      zeroActivityNames,
      anomalies: [],
    });
  }, [
    checkedCount,
    readiness,
    securities.buys.length,
    securities.sells.length,
    transactionIssues,
    zeroActivityNames,
  ]);

  const financialResult = useMemo(
    () => ({
      totalAssets: reportBundle?.balanceSheet.assets.total ?? null,
      totalLiabilities: reportBundle?.balanceSheet.liabilities.total ?? null,
      equity: reportBundle?.balanceSheet.equity.total ?? null,
      netIncome: reportBundle?.incomeStatement.netIncome ?? null,
      netCashFlow: reportBundle?.cashFlow.netCashChange ?? null,
    }),
    [reportBundle],
  );

  const reportResults = useMemo(
    () =>
      (['INCOME_STATEMENT', 'BALANCE_SHEET', 'CASH_FLOW'] as const).map((viewId) => ({
        title: REPORT_VIEW_TITLES[viewId],
        isGenerated: reportsPersisted ?? false,
      })),
    [reportsPersisted],
  );

  const closeSummaryVM = useMemo(
    () =>
      mapCloseSummary({
        stages: pageVM.stages.map((stage) => ({
          stageId: stage.stageId,
          label: stage.label,
          isCompleted: stage.isCompleted,
          dataText: null,
        })),
        financialResult,
        reports: reportResults,
      }),
    [financialResult, pageVM.stages, reportResults],
  );

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
    accountBalances,
    setAccountBalances,
    securities,
    setSecurities,
    financing,
    setFinancing,
    removedTransactionIds,
    setRemovedTransactionIds,
    portfolioCashFlows,
    setPortfolioCashFlows,
    repayments,
    setRepayments,
    selectYearMonth: handleSelectYearMonth,
    start,
    reopen,
    refreshStageEvidence,
    evidenceFor,
    handleConfirmStage,
    handleConfirmStageWithWarning,
    readinessVM,
    closeSummaryVM,
    financialResult,
    handleGoToStage,
    handleClosePeriod,
    drawer,
    drawerForm,
  };
};
