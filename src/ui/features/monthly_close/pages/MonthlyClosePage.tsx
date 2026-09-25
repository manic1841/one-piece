import React from 'react';

import { PeriodBadge } from '@/ui/components/PeriodBadge';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';
import { ClosePipeline } from '@/ui/features/monthly_close/components/ClosePipeline';

import { CloseAccountBalanceInputs } from '../components/CloseAccountBalanceInputs';
import { CloseStageEvidenceList } from '../components/CloseStageEvidenceList';
import { CloseStageInputs } from '../components/CloseStageInputs';
import { CloseWorkspace } from '../components/CloseWorkspace';
import { TradeDrawer } from '../components/TradeDrawer';
import { TradeTable } from '../components/TradeTable';
import { type TradeSide } from '../components/TradeTable';
import { useMonthlyClosePage } from '../hooks/useMonthlyClosePage';
import { type CloseStageId, isReopenablePeriod } from '../viewmodels/monthlyClose.vm';

interface MonthlyClosePageProps {
  householdId?: string;
  userEmail?: string;
}

export const MonthlyClosePage: React.FC<MonthlyClosePageProps> = ({
  householdId: householdIdProp,
  userEmail: userEmailProp,
}) => {
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
    financing,
    portfolioCashFlows,
    setPortfolioCashFlows,
    repayments,
    setRepayments,
    selectYearMonth,
    start,
    reopen,
    evidenceFor,
    handleConfirmStageWithWarning,
    refreshStageEvidence,
    drawer,
    drawerForm,
  } = useMonthlyClosePage({ householdId: householdIdProp, userEmail: userEmailProp });

  const { confirm } = useConfirm();

  const TRADE_SIDES: readonly TradeSide[] = ['BUY', 'SELL'];
  const sideLabels: Record<TradeSide, string> = {
    BUY: MONTHLY_CLOSE_LABELS.BUY,
    SELL: MONTHLY_CLOSE_LABELS.SELL,
  };
  const financingSideLabels: Record<TradeSide, string> = {
    BUY: MONTHLY_CLOSE_LABELS.SHAREHOLDER_FINANCING,
    SELL: MONTHLY_CLOSE_LABELS.DIVIDEND_PAYOUT,
  };

  const isReadOnlyPeriod = pageVM.isClosed || pageVM.isCascadeDemoted;
  const showPeriodBadge = pageVM.isStarted && !isReadOnlyPeriod;

  const handleStart = async () => {
    const result = await start();
    await refreshStageEvidence();
    if (!result) return;
    if (!isReopenablePeriod(result)) return;

    const confirmed = await confirm({
      title:
        result.status === 'CLOSED'
          ? MONTHLY_CLOSE_LABELS.REOPENED_TITLE
          : MONTHLY_CLOSE_LABELS.REOPENED_BANNER,
      context: MONTHLY_CLOSE_LABELS.REOPENED_CONTEXT,
      consequence: MONTHLY_CLOSE_LABELS.REOPENED_CONSEQUENCE,
      confirmLabel: MONTHLY_CLOSE_LABELS.REOPEN_CONFIRM,
      cancelLabel: MONTHLY_CLOSE_LABELS.CANCEL,
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
    const hasInputs: boolean =
      stageId === 'ACCOUNT_BALANCE' ||
      stageId === 'SECURITIES_TRADE' ||
      stageId === 'PORTFOLIO_CASH_FLOW' ||
      stageId === 'DEBT_REPAYMENT';
    if (!hasInputs) {
      return null;
    }
    const disabled = confirmingStageId !== null;
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
        ) : stageId === 'SECURITIES_TRADE' ? (
          <div className="space-y-6">
            <TradeTable
              title={MONTHLY_CLOSE_LABELS.SECURITIES_TRANSACTIONS}
              sideLabels={sideLabels}
              rows={drawer
                .toTradeRows(securities.buys, 'BUY')
                .concat(drawer.toTradeRows(securities.sells, 'SELL'))}
              projectIdName={(projectId) =>
                portfolios.find((portfolio) => portfolio.id === projectId)?.name ?? null
              }
              onAdd={() => drawer.open('SECURITIES', 'ADD')}
              onRowClick={(row) => drawer.open('SECURITIES', 'EDIT', row)}
              disabled={disabled}
            />
            <TradeTable
              title={MONTHLY_CLOSE_LABELS.FINANCING_RECORDS}
              sideLabels={financingSideLabels}
              netLabel={MONTHLY_CLOSE_LABELS.NET_FINANCING_CASH_FLOW}
              rows={drawer
                .toTradeRows(financing.shareholderFinancing, 'BUY')
                .concat(drawer.toTradeRows(financing.dividendPayout, 'SELL'))}
              projectIdName={(projectId) =>
                portfolios.find((portfolio) => portfolio.id === projectId)?.name ?? null
              }
              onAdd={() => drawer.open('FINANCING', 'ADD')}
              onRowClick={(row) => drawer.open('FINANCING', 'EDIT', row)}
              disabled={disabled}
            />
          </div>
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
            portfolioCashFlows={portfolioCashFlows}
            repayments={repayments}
            onPortfolioCashFlowsChange={setPortfolioCashFlows}
            onRepaymentsChange={setRepayments}
            disabled={disabled}
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
                <PeriodBadge label={MONTHLY_CLOSE_LABELS.PERIOD_LABEL} period={selectedYearMonth} />
              ) : (
                <>
                  <YearMonthPicker
                    mode="year-month"
                    year={selectedYearMonth.slice(0, 4)}
                    month={selectedYearMonth.slice(5, 7)}
                    onYearChange={(y) => selectYearMonth(`${y}-${selectedYearMonth.slice(5, 7)}`)}
                    onMonthChange={(m) =>
                      selectYearMonth(`${selectedYearMonth.slice(0, 4)}-${m.padStart(2, '0')}`)
                    }
                  />
                  <Button
                    onClick={() => void handleStart()}
                    disabled={
                      isStarting || (pageVM.isStarted && !isReadOnlyPeriod) || !selectedYearMonth
                    }
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
                <p className="text-sm font-bold text-foreground">
                  {MONTHLY_CLOSE_LABELS.FINALIZED}
                </p>
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
                <p className="text-sm text-muted-foreground">
                  {MONTHLY_CLOSE_LABELS.SELECT_PERIOD}
                </p>
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
                  onConfirm={() => void handleConfirmStageWithWarning(displayedStage.stageId)}
                  onBackToCurrent={() => setViewingStageId(null)}
                />
              )}
            </div>
          )}

          <TradeDrawer
            open={drawer.state.kind !== null}
            sides={TRADE_SIDES}
            sideLabels={drawer.state.kind === 'FINANCING' ? financingSideLabels : sideLabels}
            title={
              drawer.state.kind === 'FINANCING'
                ? drawer.state.mode === 'ADD'
                  ? MONTHLY_CLOSE_LABELS.ADD_FINANCING_TRANSACTION
                  : MONTHLY_CLOSE_LABELS.EDIT_TRANSACTION
                : drawer.state.mode === 'ADD'
                  ? MONTHLY_CLOSE_LABELS.ADD_SECURITIES_TRANSACTION
                  : MONTHLY_CLOSE_LABELS.EDIT_TRANSACTION
            }
            form={drawerForm.form}
            portfolios={portfolios.map((portfolio) => ({ id: portfolio.id, name: portfolio.name }))}
            canDelete
            submitting={confirmingStageId !== null}
            onConfirm={drawerForm.submit}
            onCancel={drawer.close}
            onDelete={drawer.deleteRow}
          />
        </>
      )}
    </div>
  );
};

export default MonthlyClosePage;
