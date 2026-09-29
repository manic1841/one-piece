import React from 'react';

import { PeriodBadge } from '@/ui/components/PeriodBadge';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { ClosePipeline } from '@/ui/features/monthly_close/components/ClosePipeline';
import { CloseStageBlockedNotice } from '@/ui/features/monthly_close/components/CloseStageBlockedNotice';

import { useMonthlyClosePage } from '../hooks/useMonthlyClosePage';

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
    isStarting,
    error,
    entitiesError,
    blockedReason,
    setViewingStageId,
    currentStageId,
    displayedStageId,
    displayedStage,
    positionText,
    stepRegistry,
    stageContext,
    selectYearMonth,
    handleStart,
  } = useMonthlyClosePage({ householdId: householdIdProp, userEmail: userEmailProp });

  // The picker/badge lock whenever the period can no longer be walked (closed
  // or cascade-demoted). Distinct from the stage workspace's read-only rule,
  // which only CLOSED triggers.
  const isPeriodLocked = pageVM.isClosed || pageVM.isCascadeDemoted;
  const showPeriodBadge = pageVM.isStarted && !isPeriodLocked;

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
                      isStarting || (pageVM.isStarted && !isPeriodLocked) || !selectedYearMonth
                    }
                    className="active:scale-[0.97]"
                  >
                    {isStarting ? MONTHLY_CLOSE_LABELS.LOADING : MONTHLY_CLOSE_LABELS.START}
                  </Button>
                </>
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
                onSelectStage={setViewingStageId}
              />

              {displayedStage && (
                <>
                  {/* A refused confirm must say why instead of doing nothing
                      (#233). Sits with the stage card, next to its actions. */}
                  <CloseStageBlockedNotice reason={blockedReason} />
                  {/* Every stage renders through the same evidence-only shell,
                      so React would reuse the instance across stages; the key
                      forces a remount when the walk moves. */}
                  <React.Fragment key={displayedStage.stageId}>
                    {stepRegistry[displayedStage.stageId].render(stageContext)}
                  </React.Fragment>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MonthlyClosePage;
