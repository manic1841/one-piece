import React from 'react';

import { Link } from 'react-router-dom';

import { PageHeader } from '@/ui/components/PageHeader';
import { PeriodBadge } from '@/ui/components/PeriodBadge';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
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
      <PageHeader
        crumb={MONTHLY_CLOSE_LABELS.PAGE_TITLE}
        title={pageVM.periodTitle}
        badge={<PeriodBadge label={pageVM.periodLabel} period={pageVM.periodText} />}
        actions={
          <>
            <Link
              to="/close"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {MONTHLY_CLOSE_LABELS.SWITCH_PERIOD}
            </Link>
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
          </>
        }
      />

      {(error || entitiesError) && (
        <Alert variant="destructive">
          <AlertDescription>{error ?? entitiesError}</AlertDescription>
        </Alert>
      )}

      {pageVM.isClosed && (
        <Alert variant="default">
          <StatusGlyph type="verified" label={MONTHLY_CLOSE_LABELS.FINALIZED_SUBTITLE} />
          <AlertDescription>{MONTHLY_CLOSE_LABELS.FINALIZED}</AlertDescription>
        </Alert>
      )}

      {pageVM.isCascadeDemoted && (
        <Alert variant="warning">
          <StatusGlyph type="review" label={MONTHLY_CLOSE_LABELS.NEEDS_REVIEW} />
          <AlertDescription>{MONTHLY_CLOSE_LABELS.CASCADE_BANNER}</AlertDescription>
        </Alert>
      )}

      {pageVM.isPaused && pageVM.reviewSourceStageId && pageVM.reviewSourceLabel && (
        <Alert variant="warning">
          <StatusGlyph type="review" label={MONTHLY_CLOSE_LABELS.NEEDS_REVIEW} />
          <AlertDescription>
            {MONTHLY_CLOSE_LABELS.PAUSED}：{pageVM.reviewSourceLabel}
          </AlertDescription>
        </Alert>
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
