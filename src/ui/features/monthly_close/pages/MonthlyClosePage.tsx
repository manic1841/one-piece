import React from 'react';

import { Link } from 'react-router-dom';

import { PeriodBadge } from '@/ui/components/PeriodBadge';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Button } from '@/ui/components/ui/button';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { ClosePipeline } from '@/ui/features/monthly_close/components/ClosePipeline';

import { useMonthlyClosePage } from '../hooks/useMonthlyClosePage';
import { type FinancialPeriod } from '../viewmodels/monthlyClose.vm';

interface MonthlyClosePageProps {
  householdId: string;
  userEmail: string;
  yearMonth: string;
  initialPeriod: FinancialPeriod;
}

export const MonthlyClosePage: React.FC<MonthlyClosePageProps> = ({
  householdId,
  userEmail,
  yearMonth,
  initialPeriod,
}) => {
  const {
    pageVM,
    error,
    entitiesError,
    setViewingStageId,
    currentStageId,
    displayedStageId,
    displayedStage,
    positionText,
    stepRegistry,
    stageContext,
    isStarting,
    handleReopen,
  } = useMonthlyClosePage({ householdId, userEmail, yearMonth, initialPeriod });

  // Closed or cascade-demoted: reopen is the only accepted mutation.
  const isPeriodLocked = pageVM.isClosed || pageVM.isCascadeDemoted;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-base">
      <div className="flex flex-col gap-4 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.PAGE_TITLE}
          </p>
          <h1 className="text-[30px] font-medium leading-tight text-foreground">
            {yearMonth.slice(0, 4)} 年 {Number(yearMonth.slice(5, 7))} 月
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/close"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {MONTHLY_CLOSE_LABELS.SWITCH_PERIOD}
          </Link>
          <PeriodBadge label={MONTHLY_CLOSE_LABELS.PERIOD_LABEL} period={yearMonth} />
          {isPeriodLocked && (
            <Button
              variant="outline"
              onClick={() => void handleReopen()}
              disabled={isStarting}
              className="active:scale-[0.97]"
            >
              {MONTHLY_CLOSE_LABELS.REOPEN_CONFIRM}
            </Button>
          )}
        </div>
      </div>

      {(error || entitiesError) && (
        <div className="rounded-lg border border-negative/20 bg-negative/10 px-4 py-3 text-sm text-negative">
          {error ?? entitiesError}
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

      {pageVM.isCascadeDemoted && (
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

      <div className="space-y-5">
        <ClosePipeline
          stages={pageVM.stages}
          currentStageId={currentStageId}
          viewingStageId={displayedStageId}
          isClosed={pageVM.isClosed}
          isPaused={pageVM.isPaused}
          statusText={pageVM.statusText}
          positionText={positionText}
          onSelectStage={setViewingStageId}
        />

        {displayedStage && (
          // The shell is reused across stages; the key remounts it when the walk moves.
          <React.Fragment key={displayedStage.stageId}>
            {stepRegistry[displayedStage.stageId].render(stageContext)}
          </React.Fragment>
        )}
      </div>
    </div>
  );
};
export default MonthlyClosePage;
