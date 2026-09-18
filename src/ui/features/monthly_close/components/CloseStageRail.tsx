import React from 'react';

import { getCloseStageLabel } from '@/ui/constants/monthlyClose';
import { StatusGlyph } from '@/ui/components/StatusGlyph';

import type { CloseStageItemVM } from '../viewmodels/monthlyClose.vm';

interface CloseStageRailProps {
  stages: CloseStageItemVM[];
  isClosed: boolean;
}

const railGlyphMap: Record<CloseStageItemVM['status'] | 'REVIEW', 'verified' | 'waiting' | 'review'> = {
  PENDING: 'waiting',
  COMPLETED: 'verified',
  REVIEW: 'review',
};

export const CloseStageRail: React.FC<CloseStageRailProps> = ({ stages, isClosed }) => {
  const currentStageId = isClosed
    ? null
    : (stages.find((stage) => !stage.isCompleted)?.stageId ?? null);

  return (
    <ol aria-label="Close workflow pipeline" className="flex flex-row items-start gap-0">
      {stages.map((stage, index) => {
        const isCurrent = stage.stageId === currentStageId;
        const isReviewSource = stage.isReviewSource;
        const glyphType = railGlyphMap[isReviewSource && !isClosed ? 'REVIEW' : stage.status];

        return (
          <li key={stage.stageId} className="flex min-w-0 flex-1 flex-row items-start">
            <div
              data-testid="close-rail-item"
              data-current={String(isCurrent)}
              data-review={String(isReviewSource)}
              className={
                isCurrent
                  ? 'flex min-w-0 flex-1 flex-col items-center rounded bg-elevated/60 px-1 py-2 text-center'
                  : 'flex min-w-0 flex-1 flex-col items-center px-1 py-2 text-center'
              }
            >
              <StatusGlyph
                type={glyphType}
                label={getCloseStageLabel(stage.stageId as never)}
              />
              {isCurrent && (
                <span className="mt-1 whitespace-nowrap text-[10px] font-semibold tracking-wider text-foreground">
                  CURRENT STEP
                </span>
              )}
            </div>
            {index < stages.length - 1 && (
              <span
                aria-hidden="true"
                className="mt-3 h-px w-4 shrink-0 bg-border"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};
