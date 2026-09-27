import React from 'react';

import { Button } from '@/ui/components/ui/button';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import type { CloseStageItemVM } from '../viewmodels/monthlyClose.vm';

interface CloseWorkspaceProps {
  stage: CloseStageItemVM;
  stepText: string;
  isReviewing: boolean;
  progressText: string;
  confirming: boolean;
  isClosed: boolean;
  evidence: React.ReactNode;
  inputs: React.ReactNode;
  onConfirm: () => void;
  onBackToCurrent: () => void;
}

export const CloseWorkspace: React.FC<CloseWorkspaceProps> = ({
  stage,
  stepText,
  isReviewing,
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
    <section className="space-y-4 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">當前步驟</p>
          <div className="flex items-center gap-2">
            <h2 className="text-[22px] font-medium leading-tight text-foreground">{stepText}</h2>
          </div>
        </div>
        <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
          {progressText}
        </span>
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
        <div className="flex items-center justify-end gap-3 border-t border-border pt-[26px]">
          <Button
            size="sm"
            disabled={confirming}
            onClick={onConfirm}
            className="h-[38px] px-[18px] active:scale-[0.97]"
          >
            {actionLabel}
          </Button>
          {isReviewing && (
            <Button size="sm" variant="ghost" onClick={onBackToCurrent} className="h-[38px] px-4">
              {MONTHLY_CLOSE_LABELS.BACK_TO_CURRENT}
            </Button>
          )}
        </div>
      )}
    </section>
  );
};

export default CloseWorkspace;
