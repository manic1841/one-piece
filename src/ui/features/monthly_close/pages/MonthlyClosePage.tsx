import React, { useEffect, useState } from 'react';

import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { getCloseStageLabel, MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
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
import type { Account } from '@/domains/account/schemas';
import type { Portfolio } from '@/domains/portfolio/schemas';
import type { DebtAccount } from '@/domains/debt/schemas';
import type { CloseStageId } from '@/domains/financial_period/schemas';
import { useAuthContext } from '@/ui/hooks/useAuthContext';
import { useAuth } from '@/infra/contexts/useAuth';

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
import { CloseStageList } from '../components/CloseStageList';
import { CloseStageRail } from '../components/CloseStageRail';

interface MonthlyClosePageProps {
  householdId?: string;
  userEmail?: string;
}

const currentYearMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
};

export const MonthlyClosePage: React.FC<MonthlyClosePageProps> = ({ householdId: householdIdProp, userEmail: userEmailProp }) => {
  const { userProfile } = useAuth();
  const householdId = householdIdProp ?? userProfile?.householdId ?? '';
  const userEmail = userEmailProp ?? userProfile?.email ?? '';
  const auth = useAuthContext();
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
    void refreshStageEvidence();
  }, [householdId, selectedYearMonth, refreshStageEvidence]);

  const stageEvidence = (stageId: string): CloseStageEvidence => {
    if (stageId === 'TRANSACTION_VALIDATION') {
      return mapTransactionIssuesToEvidence(transactionIssues);
    }
    if (stageId === 'COMPLETENESS_CHECK') {
      return mapAnomaliesToEvidence(anomalies);
    }
    if (stageId === 'FINANCIAL_REPORTS') {
      if (cashFlowAdjustment !== null) {
        return mapAdjustmentCountToEvidence(cashFlowAdjustment);
      }
      return NO_EVIDENCE;
    }
    if (stageId === 'CLOSE_PERIOD') {
      if (reportsPersisted !== null) {
        return mapPersistenceToEvidence(reportsPersisted);
      }
      return NO_EVIDENCE;
    }
    return NO_EVIDENCE;
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
    <CloseStageEvidenceList evidence={stageEvidence(stageId)} />
  );

  const renderInputs = (stageId: string) => {
    if (
      stageId !== 'ACCOUNT_BALANCE' &&
      stageId !== 'SECURITIES_TRADE' &&
      stageId !== 'PORTFOLIO_CASH_FLOW' &&
      stageId !== 'DEBT_REPAYMENT'
    ) {
      return null;
    }
    return (
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {MONTHLY_CLOSE_LABELS.INPUTS_LABEL}
        </p>
        <CloseStageInputs
          stageId={stageId}
          yearMonth={selectedYearMonth}
          accounts={accounts.map((account) => ({ id: account.id, name: account.name }))}
          portfolios={portfolios.map((portfolio) => ({ id: portfolio.id, name: portfolio.name }))}
          debtAccounts={debtAccounts.map((debtAccount) => ({
            id: debtAccount.id,
            name: debtAccount.name,
            currentBalance: debtAccount.currentBalance,
          }))}
          accountBalances={accountBalances}
          securities={securities}
          financing={financing}
          portfolioCashFlows={portfolioCashFlows}
          repayments={repayments}
          onAccountBalancesChange={setAccountBalances}
          onSecuritiesChange={setSecurities}
          onFinancingChange={setFinancing}
          onPortfolioCashFlowsChange={setPortfolioCashFlows}
          onRepaymentsChange={setRepayments}
          disabled={confirmingStageId !== null}
        />
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-0.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {MONTHLY_CLOSE_LABELS.PAGE_TITLE}
              </h1>
              <p className="text-xs font-medium text-muted-foreground">
                {MONTHLY_CLOSE_LABELS.PAGE_SUBTITLE}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <YearMonthPicker
                mode="year-month"
                year={selectedYearMonth.slice(0, 4) || currentYearMonth().slice(0, 4)}
                month={selectedYearMonth.slice(5, 7) || currentYearMonth().slice(5, 7)}
                onYearChange={(y) =>
                  selectYearMonth(`${y}-${selectedYearMonth.slice(5, 7) || currentYearMonth().slice(5, 7)}`)
                }
                onMonthChange={(m) =>
                  selectYearMonth(`${selectedYearMonth.slice(0, 4) || currentYearMonth().slice(0, 4)}-${m.padStart(2, '0')}`)
                }
              />
              <Button
                onClick={() => void start().then(() => void refreshStageEvidence())}
                disabled={isStarting || pageVM.isStarted || !selectedYearMonth}
                className="active:scale-[0.97]"
              >
                {isStarting ? MONTHLY_CLOSE_LABELS.LOADING : MONTHLY_CLOSE_LABELS.START}
              </Button>
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
                  {MONTHLY_CLOSE_LABELS.PAUSED}：{getCloseStageLabel(pageVM.reviewSourceStageId)}
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
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <StatusGlyph
                    type={pageVM.isClosed ? 'verified' : pageVM.isPaused ? 'review' : 'active'}
                    label={pageVM.statusText}
                  />
                  <span className="text-xs text-muted-foreground">{pageVM.periodText}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {MONTHLY_CLOSE_LABELS.PROGRESS_LABEL}: {pageVM.completedCount}/{pageVM.totalCount}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.STAGE_GUIDANCE}</p>
              <div className="hidden md:block">
                <CloseStageRail
                  stages={pageVM.stages}
                  isClosed={pageVM.isClosed}
                />
              </div>
              <div className="md:hidden">
                <CloseStageList
                  stages={pageVM.stages}
                  confirmingStageId={confirmingStageId}
                  isClosed={pageVM.isClosed}
                  isPaused={pageVM.isPaused}
                  onConfirmStage={(stageId) => void handleConfirmStage(stageId as CloseStageId)}
                  renderEvidence={renderEvidence}
                  renderInputs={renderInputs}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MonthlyClosePage;
