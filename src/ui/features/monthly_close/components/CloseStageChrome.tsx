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
    <section className="space-y-3 pt-4">
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

      {/* The content sits a step further from the rule than the `space-y` rhythm,
          so the title reads as a heading over a body rather than as the first of
          a stack of equal blocks. */}
      <div className="space-y-3 pt-2">{children}</div>

      {showActionBar && (
        /* `pb`/`pr` keep the fixed pet off the button on phones and desktops. */
        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border pt-[26px] pb-16 pr-20 sm:flex-row sm:items-center sm:justify-end md:pb-0 md:pr-24">
          {isReviewing && onBackToCurrent && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onBackToCurrent}
              className="min-h-11 px-4 active:scale-[0.97]"
            >
              {MONTHLY_CLOSE_LABELS.BACK_TO_CURRENT}
            </Button>
          )}
          <Button
            size="sm"
            disabled={!canConfirm}
            onClick={onConfirm}
            className="min-h-11 w-full px-[18px] active:scale-[0.97] sm:w-auto"
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </section>
  );
};
