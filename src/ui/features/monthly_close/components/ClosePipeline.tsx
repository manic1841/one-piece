import React, { useState } from 'react';

import { ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/ui/utils/cn';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { getCloseStageLabel, MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import type { CloseStageItemVM } from '../viewmodels/monthlyClose.vm';

export type ClosePipelineStageStatus = 'CURRENT' | 'COMPLETED' | 'WAITING' | 'REVIEW';

interface ClosePipelineProps {
  stages: CloseStageItemVM[];
  currentStageId: string | null;
  viewingStageId: string | null;
  isClosed: boolean;
  isPaused: boolean;
  statusText: string;
  positionText: string;
  onSelectStage: (stageId: string) => void;
}

const stepNumber = (index: number): string =>
  (index + 1).toString().padStart(2, '0');

const stageStatus = (
  stage: CloseStageItemVM,
  currentStageId: string | null,
  isClosed: boolean,
  isPaused: boolean,
): ClosePipelineStageStatus => {
  if (isClosed) return 'COMPLETED';
  if (stage.stageId === currentStageId) return 'CURRENT';
  if (isPaused && stage.isReviewSource) return 'REVIEW';
  return stage.isCompleted ? 'COMPLETED' : 'WAITING';
};

const glyphTypeMap: Record<ClosePipelineStageStatus, 'active' | 'verified' | 'waiting' | 'review'> = {
  CURRENT: 'active',
  COMPLETED: 'verified',
  WAITING: 'waiting',
  REVIEW: 'review',
};

const headerGlyphType = (isClosed: boolean, isPaused: boolean): 'active' | 'verified' | 'review' =>
  isClosed ? 'verified' : isPaused ? 'review' : 'active';

export const ClosePipeline: React.FC<ClosePipelineProps> = ({
  stages,
  currentStageId,
  viewingStageId,
  isClosed,
  isPaused,
  statusText,
  positionText,
  onSelectStage,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-0">
      <div className="flex h-[58px] items-center justify-between gap-3 border-b border-border">
        <div className="flex items-center gap-4">
          <StatusGlyph type={headerGlyphType(isClosed, isPaused)} label={statusText} />
          <span className="font-mono text-xs tabular-nums text-accent-foreground">
            {positionText}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-controls="close-pipeline-stages"
          data-testid="close-pipeline-toggle"
          className={cn(
            'inline-flex h-8 shrink-0 items-center gap-1.5 border-0 bg-transparent px-0 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground transition-colors',
            'hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          )}
        >
          {isExpanded
            ? MONTHLY_CLOSE_LABELS.HIDE_WORKFLOW
            : MONTHLY_CLOSE_LABELS.SHOW_WORKFLOW}
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {isExpanded && (
        <ol
          id="close-pipeline-stages"
          aria-label="Close workflow pipeline"
          className="grid grid-cols-1 gap-[7px] border-b border-border py-4 md:grid-cols-9 md:gap-[7px]"
        >
          {stages.map((stage, index) => {
            const status = stageStatus(stage, currentStageId, isClosed, isPaused);
            const isViewing = stage.stageId === viewingStageId && !isClosed;
            const completedIndex = stages.findIndex((item) => !item.isCompleted);
            const isBeforeCurrent =
              status === 'WAITING' && completedIndex !== -1 && index < completedIndex;

            const disabled = isClosed || status === 'WAITING' && !isBeforeCurrent;

            const clickable = !disabled && !isViewing;

            return (
              <li key={stage.stageId} className="flex min-w-0">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => onSelectStage(stage.stageId)}
                  aria-current={status === 'CURRENT' ? 'step' : undefined}
                  className={cn(
                    'group flex h-11 w-full items-center gap-2 rounded px-2 text-left text-xs transition-colors',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    isViewing
                      ? 'bg-elevated text-foreground'
                      : status === 'CURRENT'
                        ? 'bg-elevated/60 text-foreground'
                        : 'text-muted-foreground',
                    clickable && 'hover:bg-elevated/60 hover:text-foreground',
                    !clickable && 'cursor-not-allowed',
                  )}
                >
                  <StatusGlyph type={glyphTypeMap[status]} label="" className="shrink-0" />
                  <span className="whitespace-nowrap font-semibold tracking-widest opacity-60">
                    {stepNumber(index)}
                  </span>
                  <span className="truncate font-medium">
                    {getCloseStageLabel(stage.stageId)}
                  </span>
                  {stage.isStale && status !== 'WAITING' && (
                    <span
                      data-testid="close-pipeline-stale"
                      className="shrink-0 rounded-sm border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold text-warning"
                    >
                      {MONTHLY_CLOSE_LABELS.NEEDS_RECONFIRM}
                    </span>
                  )}
                  {status === 'REVIEW' && (
                    <span
                      data-testid="close-pipeline-review"
                      className="shrink-0 rounded-sm border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold text-warning"
                    >
                      {MONTHLY_CLOSE_LABELS.NEEDS_REVIEW}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default ClosePipeline;
