import React from 'react';

import { Button } from '@/ui/components/ui/button';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import type { CloseStageItemVM } from '../viewmodels/monthlyClose.vm';

interface CloseWorkspaceProps {
  stage: CloseStageItemVM;
  stepText: string;
  isReviewing: boolean;
  statusText: string;
  progressText: string;
  confirming: boolean;
  isClosed: boolean;
  evidence: React.ReactNode;
  inputs: React.ReactNode;
  onConfirm: () => void;
  onBackToCurrent: () => void;
}

const headerGlyph = (isReviewing: boolean, isCompleted: boolean) =>
  isReviewing ? 'review' : isCompleted ? 'verified' : 'active';

const headerLabel = (isReviewing: boolean, isCompleted: boolean) =>
  isReviewing
    ? MONTHLY_CLOSE_LABELS.REVIEWING
    : isCompleted
      ? MONTHLY_CLOSE_LABELS.RECONFIRM
      : undefined;

export const CloseWorkspace: React.FC<CloseWorkspaceProps> = ({
  stage,
  stepText,
  isReviewing,
  statusText,
  progressText,
  confirming,
  isClosed,
  evidence,
  inputs,
  onConfirm,
  onBackToCurrent,
}) => {
  const actionLabel = confirming
    ? MONTHLY_CLOSE_LABELS.LOADING
    : isReviewing
      ? MONTHLY_CLOSE_LABELS.RECONFIRM_ACTION
      : MONTHLY_CLOSE_LABELS.CONTINUE;

  return (
    <section className="space-y-4 border-t border-border/60 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusGlyph
            type={headerGlyph(isReviewing, stage.isCompleted)}
            label={headerLabel(isReviewing, stage.isCompleted) ?? statusText}
          />
          <h2 className="text-base font-semibold text-foreground">{stepText}</h2>
        </div>
        <span className="text-xs tracking-widest text-muted-foreground">{progressText}</span>
      </div>

      {stage.confirmedAtText && (
        <p className="text-xs text-muted-foreground">{stage.confirmedAtText}</p>
      )}

      <div className="space-y-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.EVIDENCE_LABEL}
          </p>
          {evidence}
        </div>
        {inputs}
      </div>

      {!isClosed && (
        <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
          <Button
            size="sm"
            disabled={confirming}
            onClick={onConfirm}
            className="active:scale-[0.97]"
          >
            {actionLabel}
          </Button>
          {isReviewing && (
            <Button size="sm" variant="ghost" onClick={onBackToCurrent}>
              {MONTHLY_CLOSE_LABELS.BACK_TO_CURRENT}
            </Button>
          )}
        </div>
      )}
    </section>
  );
};

export default CloseWorkspace;
