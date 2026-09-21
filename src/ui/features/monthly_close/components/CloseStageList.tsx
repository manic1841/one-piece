import React from 'react';

import { Button } from '@/ui/components/ui/button';
import { getCloseStageLabel, MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { StatusGlyph } from '@/ui/components/StatusGlyph';

import type { CloseStageItemVM } from '../viewmodels/monthlyClose.vm';

interface CloseStageListProps {
  stages: CloseStageItemVM[];
  confirmingStageId: string | null;
  isClosed: boolean;
  isPaused: boolean;
  onConfirmStage: (stageId: string) => void;
  renderEvidence: (stageId: string) => React.ReactNode;
  renderInputs: (stageId: string) => React.ReactNode;
}

export const CloseStageList: React.FC<CloseStageListProps> = ({
  stages,
  confirmingStageId,
  isClosed,
  isPaused,
  onConfirmStage,
  renderEvidence,
  renderInputs,
}) => {
  const currentStageId = isClosed
    ? null
    : (stages.find((stage) => !stage.isCompleted)?.stageId ?? null);

  return (
    <ol className="space-y-0" aria-label="Close workflow pipeline">
      {stages.map((stage, index) => {
        const isConfirming = confirmingStageId === stage.stageId;
        const isReviewSource = stage.isReviewSource && isPaused;
        const canConfirm = !isClosed && !stage.isCompleted;
        const isCurrent = stage.stageId === currentStageId;

        return (
          <li
            key={stage.stageId}
            className={index === 0 ? '' : 'mt-5 border-t border-border/60 pt-5'}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <StatusGlyph
                    type={stage.isCompleted ? 'verified' : isReviewSource ? 'review' : 'waiting'}
                    label={getCloseStageLabel(stage.stageId as never)}
                  />
                  {isReviewSource && (
                    <span className="rounded-sm border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                      {MONTHLY_CLOSE_LABELS.PAUSED}
                    </span>
                  )}
                  {isCurrent && (
                    <span
                      data-testid="close-list-current"
                      className="text-[10px] font-semibold tracking-wider text-foreground"
                    >
                      CURRENT STEP
                    </span>
                  )}
                </div>
                {canConfirm && (
                  <Button
                    size="sm"
                    disabled={isConfirming}
                    onClick={() => onConfirmStage(stage.stageId)}
                    className="active:scale-[0.97]"
                  >
                    {isConfirming ? MONTHLY_CLOSE_LABELS.LOADING : MONTHLY_CLOSE_LABELS.CONTINUE}
                  </Button>
                )}
                {stage.isCompleted && (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {stage.confirmedAtText ?? MONTHLY_CLOSE_LABELS.RECONFIRM}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {MONTHLY_CLOSE_LABELS.EVIDENCE_LABEL}
                  </p>
                  {renderEvidence(stage.stageId)}
                </div>
                {renderInputs(stage.stageId)}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
};
