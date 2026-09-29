import React from 'react';

import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Button } from '@/ui/components/ui/button';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import { type ReadinessExceptionVM, type ReadinessVM } from '../../../mappers/closeSummary.mappers';

interface CloseReadinessCheckProps {
  readiness: ReadinessVM;
  onConfirm: () => void;
  onGoToStage: (stageId: ReadinessExceptionVM['stageId']) => void;
  confirming: boolean;
  /** While paused, only the walk position's confirm button is enabled (ADR-0070). */
  isConfirmable: boolean;
  /** A closed or cascade-demoted period hides the confirm action. */
  isReadOnly: boolean;
}

export const CloseReadinessCheck: React.FC<CloseReadinessCheckProps> = ({
  readiness,
  onConfirm,
  onGoToStage,
  confirming,
  isConfirmable,
  isReadOnly,
}) => {
  return (
    <section className="space-y-4 pt-8" data-testid="close-readiness-check">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.EVIDENCE_LABEL}
          </p>
          <h2 className="text-[22px] font-medium leading-tight text-foreground">
            {MONTHLY_CLOSE_LABELS.READINESS_CHECK_TITLE}
          </h2>
          <p className="text-xs text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.READINESS_CHECK_NOTE}
          </p>
        </div>
        <StatusGlyph
          type={readiness.isReady ? 'verified' : 'review'}
          label={readiness.isReady ? MONTHLY_CLOSE_LABELS.READY : MONTHLY_CLOSE_LABELS.NOT_READY}
        />
      </div>

      <div className="space-y-1">
        {readiness.checks.map((check) => (
          <div
            key={check.id}
            className="flex items-center justify-between rounded-lg px-3 py-2 odd:bg-muted/30"
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
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.READINESS_EXCEPTIONS}
          </p>
          {readiness.exceptions.map((exception) => (
            <div
              key={`${exception.label}-${exception.detail}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">{exception.label}</p>
                <p className="text-xs text-muted-foreground">{exception.detail}</p>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={() => onGoToStage(exception.stageId)}
                className="h-auto p-0 text-xs font-semibold uppercase tracking-[0.08em]"
              >
                {MONTHLY_CLOSE_LABELS.GO_TO_STAGE_PREFIX}
                {exception.label}
                {MONTHLY_CLOSE_LABELS.GO_TO_STAGE_SUFFIX}
              </Button>
            </div>
          ))}
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
