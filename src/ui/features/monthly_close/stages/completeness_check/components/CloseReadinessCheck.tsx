import React from 'react';

import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import {
  CloseSectionHeading,
  closeEyebrowClass,
} from '@/ui/features/monthly_close/components/CloseSectionHeading';
import { CloseStageLoadError } from '@/ui/features/monthly_close/components/CloseStageLoadError';

import { type ReadinessExceptionVM, type ReadinessVM } from '../../../mappers/closeSummary.mappers';

interface CloseReadinessCheckProps {
  readiness: ReadinessVM;
  /** Set when a refresh failed while previously loaded readiness is shown. */
  errorMessage?: string | null;
  onConfirm: () => void;
  onGoToStage: (stageId: NonNullable<ReadinessExceptionVM['stageId']>) => void;
  confirming: boolean;
  /** While paused, only the walk position's confirm button is enabled (ADR-0070). */
  isConfirmable: boolean;
  /** A closed or cascade-demoted period hides the confirm action. */
  isReadOnly: boolean;
}

export const CloseReadinessCheck: React.FC<CloseReadinessCheckProps> = ({
  readiness,
  errorMessage = null,
  onConfirm,
  onGoToStage,
  confirming,
  isConfirmable,
  isReadOnly,
}) => {
  return (
    <section className="space-y-4 pt-8" data-testid="close-readiness-check">
      <CloseStageLoadError message={errorMessage} />
      <CloseSectionHeading
        eyebrow={MONTHLY_CLOSE_LABELS.EVIDENCE_LABEL}
        title={MONTHLY_CLOSE_LABELS.READINESS_CHECK_TITLE}
        note={MONTHLY_CLOSE_LABELS.READINESS_CHECK_NOTE}
        trailing={
          <StatusGlyph
            type={readiness.isReady ? 'verified' : 'review'}
            label={readiness.isReady ? MONTHLY_CLOSE_LABELS.READY : MONTHLY_CLOSE_LABELS.NOT_READY}
          />
        }
        className="border-b border-border pb-4"
      />

      <div className="space-y-1">
        {readiness.checks.map((check) => (
          <div
            key={check.id}
            className="flex items-center justify-between border-b border-border/60 px-3 py-2 last:border-b-0"
          >
            <div className="flex items-center gap-2">
              <StatusGlyph type={check.passed ? 'verified' : 'waiting'} />
              <span className="text-sm text-foreground">{check.label}</span>
            </div>
            <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
              {check.countText}
            </span>
          </div>
        ))}
      </div>

      {readiness.exceptions.length > 0 && (
        <div className="space-y-2">
          <p className={closeEyebrowClass}>{MONTHLY_CLOSE_LABELS.READINESS_EXCEPTIONS}</p>
          {readiness.exceptions.map((exception) => {
            const stageId = exception.stageId;
            return (
              <Alert key={`${exception.label}-${exception.detail}`} variant="warning">
                <AlertDescription className="flex flex-1 flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">{exception.label}</p>
                    <p className="text-xs text-muted-foreground">{exception.detail}</p>
                  </div>
                  {stageId !== null && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onGoToStage(stageId)}
                      className="h-auto p-0 text-xs font-semibold uppercase tracking-[0.08em]"
                    >
                      {MONTHLY_CLOSE_LABELS.GO_TO_STAGE_PREFIX}
                      {exception.label}
                      {MONTHLY_CLOSE_LABELS.GO_TO_STAGE_SUFFIX}
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {!isReadOnly && (
        <div className="flex items-center justify-end border-t border-border pt-[26px]">
          <Button
            data-testid="readiness-confirm"
            onClick={onConfirm}
            disabled={confirming || !readiness.isReady || !isConfirmable}
            className="h-[38px] px-[18px] text-xs font-semibold uppercase tracking-[0.08em]"
          >
            {confirming ? MONTHLY_CLOSE_LABELS.LOADING : MONTHLY_CLOSE_LABELS.RECONFIRM_ACTION}
          </Button>
        </div>
      )}
    </section>
  );
};
