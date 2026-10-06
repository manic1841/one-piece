import React from 'react';

import { Button } from '@/ui/components/ui/button';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import { useCloseStageChrome } from '../hooks/useCloseStageChrome';
import { CloseSectionHeading } from './CloseSectionHeading';

interface CloseStageChromeProps {
  stepText: string;
  progressText: string;
  confirmedAtText?: string | null;
  confirming: boolean;
  isReviewing?: boolean;
  /** While paused, only the walk position's confirm button is enabled (ADR-0070). */
  isConfirmable: boolean;
  /** Closed periods render read-only: the action bar is hidden. */
  isReadOnly: boolean;
  /** Closed periods hide the action bar entirely. */
  showActions: boolean;
  onConfirm: () => void;
  onBackToCurrent?: () => void;
  children: React.ReactNode;
}

/**
 * Shared chrome for every close step: the step header (current step + progress),
 * the confirmed-at line, the evidence/content slot, and the confirm bar. One
 * copy of the markup every step shares; each step component renders its own
 * content into the slot.
 */
export const CloseStageChrome: React.FC<CloseStageChromeProps> = ({
  stepText,
  progressText,
  confirmedAtText,
  confirming,
  isReviewing = false,
  isConfirmable,
  isReadOnly,
  showActions,
  onConfirm,
  onBackToCurrent,
  children,
}) => {
  const { actionLabel, canConfirm } = useCloseStageChrome({
    confirming,
    isReviewing,
    isConfirmable,
  });

  const showActionBar = showActions && !isReadOnly;

  return (
    <section className="space-y-4 pt-8">
      <CloseSectionHeading
        eyebrow={MONTHLY_CLOSE_LABELS.CURRENT_STEP}
        title={stepText}
        trailing={
          <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
            {progressText}
          </span>
        }
        className="border-b border-border pb-4"
      />

      {confirmedAtText && <p className="text-xs text-muted-foreground">{confirmedAtText}</p>}

      <div className="space-y-3">{children}</div>

      {showActionBar && (
        <div className="flex items-center justify-end gap-3 border-t border-border pt-[26px]">
          <Button
            size="sm"
            disabled={!canConfirm}
            onClick={onConfirm}
            className="h-[38px] px-[18px] active:scale-[0.97]"
          >
            {actionLabel}
          </Button>
          {isReviewing && onBackToCurrent && (
            <Button size="sm" variant="ghost" onClick={onBackToCurrent} className="h-[38px] px-4">
              {MONTHLY_CLOSE_LABELS.BACK_TO_CURRENT}
            </Button>
          )}
        </div>
      )}
    </section>
  );
};
