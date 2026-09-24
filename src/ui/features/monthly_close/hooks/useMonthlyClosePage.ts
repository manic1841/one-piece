import { useCallback, useEffect, useState } from 'react';

import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { getPreviousSnapshotUseCase } from '@/application/account/use_cases/getPreviousSnapshotUseCase';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import {
  type AccountBalanceInput,
  type DebtRepaymentInput,
  type FinancingInput,
  type SecuritiesTradeInput,
} from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { type Account, type AccountSnapshot } from '@/domains/account/types/account';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type CloseStageId } from '@/domains/financial_period/schemas';
import { type Portfolio } from '@/domains/portfolio/schemas';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useMonthlyClose } from '@/ui/features/monthly_close/hooks/useMonthlyClose';
import {
  mapAdjustmentCountToEvidence,
  mapAnomaliesToEvidence,
  mapPersistenceToEvidence,
  mapTransactionIssuesToEvidence,
  NO_EVIDENCE,
} from '@/ui/features/monthly_close/mappers/monthlyClose.mappers';
import {
  type CloseStageEvidence,
  resolveDisplayedStageId,
  resolvePositionText,
  resolveStepText,
} from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';

interface UseMonthlyClosePageArgs {
  householdId?: string;
  userEmail?: string;
}

/**
 * Owns MonthlyClosePage's data: the close workflow state, the entity lists the
 * stage inputs need, every stage input in progress, and the derived stage
 * selection. The page keeps only layout and rendering.
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
    selectYearMonth,
    start,
    confirmStage,
    refreshStageEvidence,
  } = useMonthlyClose({ householdId, userEmail });

  const [viewingStageId, setViewingStageId] = useState<CloseStageId | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalanceInput[]>([]);
  const [accountSnapshots, setAccountSnapshots] = useState<Map<string, AccountSnapshot>>(new Map());
  const [securities, setSecurities] = useState<{
    buys: SecuritiesTradeInput[];
    sells: SecuritiesTradeInput[];
  }>({ buys: [], sells: [] });
  const [financing, setFinancing] = useState<{
    shareholderFinancing: FinancingInput[];
    dividendPayout: FinancingInput[];
  }>({ shareholderFinancing: [], dividendPayout: [] });
  const [portfolioCashFlows, setPortfolioCashFlows] = useState<
    Record<string, { deposits: number; withdrawals: number }>
  >({});
  const [repayments, setRepayments] = useState<DebtRepaymentInput[]>([]);

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
    let cancelled = false;

    const loadAccountSnapshots = async () => {
      const entries = await Promise.all(
        accounts.map(async (account) => {
          const snapshot = await getPreviousSnapshotUseCase.execute({
            householdId,
            accountId: account.id,
            year: Number(selectedYearMonth.slice(0, 4)),
            month: Number(selectedYearMonth.slice(5, 7)),
            auth,
          });
          return [account.id, snapshot] as const;
        }),
      );
      if (cancelled) return;
      const map = new Map<string, AccountSnapshot>();
      for (const [accountId, snapshot] of entries) {
        if (snapshot) map.set(accountId, snapshot);
      }
      setAccountSnapshots(map);
    };

    void loadAccountSnapshots();
    return () => {
      cancelled = true;
    };
  }, [accounts, auth, householdId, selectedYearMonth]);

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
      await confirmStage({
        stageId,
        accountBalances: stageId === 'ACCOUNT_BALANCE' ? accountBalances : undefined,
        securities: stageId === 'SECURITIES_TRADE' ? securities : undefined,
        financing: stageId === 'SECURITIES_TRADE' ? financing : undefined,
        portfolioCashFlows: stageId === 'PORTFOLIO_CASH_FLOW' ? portfolioCashFlows : undefined,
        repayments: stageId === 'DEBT_REPAYMENT' ? repayments : undefined,
      });
      await refreshStageEvidence();
    },
    [
      accountBalances,
      confirmStage,
      financing,
      portfolioCashFlows,
      refreshStageEvidence,
      repayments,
      securities,
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
    accounts,
    accountSnapshots,
    portfolios,
    debtAccounts,
    accountBalances,
    setAccountBalances,
    securities,
    setSecurities,
    financing,
    setFinancing,
    portfolioCashFlows,
    setPortfolioCashFlows,
    repayments,
    setRepayments,
    selectYearMonth,
    start,
    evidenceFor,
    handleConfirmStage,
    refreshStageEvidence,
  };
};

export type MonthlyClosePageController = ReturnType<typeof useMonthlyClosePage>;
