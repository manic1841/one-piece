import React, { useEffect, useState } from 'react';

import { ClosePipeline } from '@/ui/features/monthly_close/components/ClosePipeline';
import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { PeriodBadge } from '@/ui/components/PeriodBadge';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import {
  getPreviousSnapshotUseCase,
} from '@/application/account/use_cases/getPreviousSnapshotUseCase';
import {
  getAccountsUseCase,
} from '@/application/account/use_cases/getAccountsUseCase';
import {
  listPortfoliosUseCase,
} from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import {
  listDebtAccountsUseCase,
} from '@/application/debt/use_cases/listDebtAccountsUseCase';
import type {
  AccountBalanceInput,
  DebtRepaymentInput,
  FinancingInput,
  SecuritiesTradeInput,
} from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import type { Account, AccountSnapshot } from '@/domains/account/types/account';
import type { Portfolio } from '@/domains/portfolio/schemas';
import type { DebtAccount } from '@/domains/debt/schemas';
import type { CloseStageId } from '@/domains/financial_period/schemas';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useAuthState } from '@/ui/contexts/useAuthState';

import { useMonthlyClose } from '../hooks/useMonthlyClose';
import {
  mapAdjustmentCountToEvidence,
  mapAnomaliesToEvidence,
  mapPersistenceToEvidence,
  mapTransactionIssuesToEvidence,
  NO_EVIDENCE,
} from '../mappers/monthlyClose.mappers';
import type { CloseStageEvidence } from '../viewmodels/monthlyClose.vm';
import { CloseStageEvidenceList } from '../components/CloseStageEvidenceList';
import { CloseStageInputs } from '../components/CloseStageInputs';
import { CloseAccountBalanceInputs } from '../components/CloseAccountBalanceInputs';
import { CloseWorkspace } from '../components/CloseWorkspace';

interface MonthlyClosePageProps {
  householdId?: string;
  userEmail?: string;
}

interface DisplayedStageTarget {
  isClosed: boolean;
  isPaused: boolean;
  reviewSourceStageId: CloseStageId | null;
  viewingStageId: CloseStageId | null;
  currentStageId: CloseStageId | null;
}

const resolveDisplayedStageId = ({
  isClosed,
  isPaused,
  reviewSourceStageId,
  viewingStageId,
  currentStageId,
}: DisplayedStageTarget): CloseStageId | null => {
  if (isClosed) return null;
  if (isPaused) return reviewSourceStageId ?? currentStageId;
  return viewingStageId ?? currentStageId;
};

const padStep = (value: number): string => value.toString().padStart(2, '0');

const resolvePositionText = (
  stages: { stageId: CloseStageId }[],
  currentStageId: CloseStageId | null,
  isClosed: boolean,
  totalCount: number,
): string => {
  const position = isClosed
    ? totalCount
    : (stages.findIndex((stage) => stage.stageId === currentStageId) + 1);
  return `${padStep(Math.max(position, 1))} / ${padStep(totalCount)}`;
};

const resolveStepText = (
  stages: { stageId: CloseStageId; label: string }[],
  displayedStageId: CloseStageId | null,
): string | null => {
  const index = stages.findIndex((stage) => stage.stageId === displayedStageId);
  if (index === -1) return null;
  return `${padStep(index + 1)} ${stages[index].label}`;
};

export const MonthlyClosePage: React.FC<MonthlyClosePageProps> = ({ householdId: householdIdProp, userEmail: userEmailProp }) => {
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

  const evidenceFor = (stageId: string): CloseStageEvidence => {
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
  };

  const handleConfirmStage = async (stageId: CloseStageId) => {
    await confirmStage({
      stageId,
      accountBalances: stageId === 'ACCOUNT_BALANCE' ? accountBalances : undefined,
      securities: stageId === 'SECURITIES_TRADE' ? securities : undefined,
      financing: stageId === 'SECURITIES_TRADE' ? financing : undefined,
      portfolioCashFlows: stageId === 'PORTFOLIO_CASH_FLOW' ? portfolioCashFlows : undefined,
      repayments: stageId === 'DEBT_REPAYMENT' ? repayments : undefined,
    });
    await refreshStageEvidence();
  };

  const renderEvidence = (stageId: string) => (
    <CloseStageEvidenceList evidence={evidenceFor(stageId)} />
  );

  const renderInputs = (stageId: string) => {
    const hasInputs: boolean = (
      stageId === 'ACCOUNT_BALANCE' ||
      stageId === 'SECURITIES_TRADE' ||
      stageId === 'PORTFOLIO_CASH_FLOW' ||
      stageId === 'DEBT_REPAYMENT'
    );
    if (!hasInputs) {
      return null;
    }
    return (
      <div className="border-t border-border pt-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {MONTHLY_CLOSE_LABELS.INPUTS_LABEL}
        </p>
        {stageId === 'ACCOUNT_BALANCE' ? (
          <CloseAccountBalanceInputs
            accounts={accounts}
            snapshots={accountSnapshots}
            inputs={accountBalances}
            stageCompleted={
              pageVM.stages.find((stage) => stage.stageId === 'ACCOUNT_BALANCE')?.isCompleted ??
              false
            }
            onInputsChange={setAccountBalances}
          />
        ) : (
          <CloseStageInputs
            stageId={stageId}
            yearMonth={selectedYearMonth}
            portfolios={portfolios.map((portfolio) => ({ id: portfolio.id, name: portfolio.name }))}
            debtAccounts={debtAccounts.map((debtAccount) => ({
              id: debtAccount.id,
              name: debtAccount.name,
              currentBalance: debtAccount.currentBalance,
            }))}
            securities={securities}
            financing={financing}
            portfolioCashFlows={portfolioCashFlows}
            repayments={repayments}
            onSecuritiesChange={setSecurities}
            onFinancingChange={setFinancing}
            onPortfolioCashFlowsChange={setPortfolioCashFlows}
            onRepaymentsChange={setRepayments}
            disabled={confirmingStageId !== null}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-base">
      {!householdId ? (
        <Card className="rounded-lg border-border/60">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">{MONTHLY_CLOSE_LABELS.SELECT_PERIOD}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-4 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {MONTHLY_CLOSE_LABELS.PAGE_TITLE}
              </p>
              <h1 className="text-[30px] font-medium leading-tight text-foreground">
                {selectedYearMonth.slice(0, 4)} 年 {Number(selectedYearMonth.slice(5, 7))} 月
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {pageVM.isStarted ? (
                <PeriodBadge
                  label={MONTHLY_CLOSE_LABELS.PERIOD_LABEL}
                  period={selectedYearMonth}
                />
              ) : (
                <>
                  <YearMonthPicker
                    mode="year-month"
                    year={selectedYearMonth.slice(0, 4)}
                    month={selectedYearMonth.slice(5, 7)}
                    onYearChange={(y) =>
                      selectYearMonth(`${y}-${selectedYearMonth.slice(5, 7)}`)
                    }
                    onMonthChange={(m) =>
                      selectYearMonth(`${selectedYearMonth.slice(0, 4)}-${m.padStart(2, '0')}`)
                    }
                  />
                  <Button
                    onClick={() => void start().then(() => void refreshStageEvidence())}
                    disabled={isStarting || pageVM.isStarted || !selectedYearMonth}
                    className="active:scale-[0.97]"
                  >
                    {isStarting ? MONTHLY_CLOSE_LABELS.LOADING : MONTHLY_CLOSE_LABELS.START}
                  </Button>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-negative/20 bg-negative/10 px-4 py-3 text-sm text-negative">
              {error}
            </div>
          )}

          {pageVM.isClosed && (
            <div className="rounded-lg border border-positive/30 bg-positive/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <StatusGlyph type="verified" label={MONTHLY_CLOSE_LABELS.FINALIZED_SUBTITLE} />
                <p className="text-sm font-bold text-foreground">{MONTHLY_CLOSE_LABELS.FINALIZED}</p>
              </div>
            </div>
          )}

          {pageVM.isPaused && pageVM.reviewSourceStageId && pageVM.reviewSourceLabel && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <StatusGlyph type="review" label={MONTHLY_CLOSE_LABELS.NEEDS_REVIEW} />
                <p className="text-sm text-foreground">
                  {MONTHLY_CLOSE_LABELS.PAUSED}：{pageVM.reviewSourceLabel}
                </p>
              </div>
            </div>
          )}

          {!pageVM.isStarted ? (
            <Card className="rounded-lg border-border/60">
              <CardContent className="p-8 text-center">
                <p className="text-sm text-muted-foreground">{MONTHLY_CLOSE_LABELS.SELECT_PERIOD}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              <ClosePipeline
                stages={pageVM.stages}
                currentStageId={currentStageId}
                viewingStageId={displayedStageId}
                isClosed={pageVM.isClosed}
                isPaused={pageVM.isPaused}
                statusText={pageVM.statusText}
                positionText={positionText}
                onSelectStage={(stageId) => setViewingStageId(stageId as CloseStageId)}
              />

              {displayedStage && (
                <CloseWorkspace
                  stage={displayedStage}
                  stepText={displayedStepText ?? positionText}
                  isReviewing={isReviewing}
                  progressText={positionText}
                  confirming={confirmingStageId === displayedStage.stageId}
                  isClosed={pageVM.isClosed}
                  evidence={renderEvidence(displayedStage.stageId)}
                  inputs={renderInputs(displayedStage.stageId)}
                  onConfirm={() => void handleConfirmStage(displayedStage.stageId)}
                  onBackToCurrent={() => setViewingStageId(null)}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MonthlyClosePage;
