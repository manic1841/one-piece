import React from 'react';

import { useConfirm } from '@/ui/features/app/confirm/ConfirmDialog';
import { ClosePipeline } from '@/ui/features/monthly_close/components/ClosePipeline';
import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { PeriodBadge } from '@/ui/components/PeriodBadge';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import { useMonthlyClosePage } from '../hooks/useMonthlyClosePage';
import { type CloseStageId, isReopenablePeriod } from '../viewmodels/monthlyClose.vm';
import { CloseStageEvidenceList } from '../components/CloseStageEvidenceList';
import { CloseStageInputs } from '../components/CloseStageInputs';
import { CloseAccountBalanceInputs } from '../components/CloseAccountBalanceInputs';
import { CloseWorkspace } from '../components/CloseWorkspace';

interface MonthlyClosePageProps {
  householdId?: string;
  userEmail?: string;
}

export const MonthlyClosePage: React.FC<MonthlyClosePageProps> = ({ householdId: householdIdProp, userEmail: userEmailProp }) => {
  const {
    householdId,
    pageVM,
    selectedYearMonth,
    confirmingStageId,
    isStarting,
    error,
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
    reopen,
    evidenceFor,
    handleConfirmStage,
    refreshStageEvidence,
  } = useMonthlyClosePage({ householdId: householdIdProp, userEmail: userEmailProp });

  const { confirm } = useConfirm();

  // Read-only states keep the picker and start button visible and enabled so
  // the reopen dialog stays reachable without a page reload; only active
  // closes show the period badge and retire the start button.
  const isReadOnlyPeriod = pageVM.isClosed || pageVM.isCascadeDemoted;
  const showPeriodBadge = pageVM.isStarted && !isReadOnlyPeriod;

  const handleStart = async () => {
    const result = await start();
    await refreshStageEvidence();
    if (!result) return;
    if (!isReopenablePeriod(result)) return;

    const confirmed = await confirm({
      title: result.status === 'CLOSED' ? MONTHLY_CLOSE_LABELS.REOPENED_TITLE : MONTHLY_CLOSE_LABELS.REOPENED_BANNER,
      context: MONTHLY_CLOSE_LABELS.REOPENED_CONTEXT,
      consequence: MONTHLY_CLOSE_LABELS.REOPENED_CONSEQUENCE,
      confirmLabel: MONTHLY_CLOSE_LABELS.REOPEN_CONFIRM,
      cancelLabel: '取消',
    });
    if (confirmed) {
      await reopen();
      await refreshStageEvidence();
    }
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
              {showPeriodBadge ? (
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
                    onClick={() => void handleStart()}
                    disabled={isStarting || (pageVM.isStarted && !isReadOnlyPeriod) || !selectedYearMonth}
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

          {pageVM.isCascadeDemoted && pageVM.isStarted && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <StatusGlyph type="review" label={MONTHLY_CLOSE_LABELS.NEEDS_REVIEW} />
                <p className="text-sm text-foreground">{MONTHLY_CLOSE_LABELS.CASCADE_BANNER}</p>
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
