import React from 'react';

interface CloseStageBlockedNoticeProps {
  /** Why the stage refused to submit; null when nothing is blocked. */
  reason: string | null;
}

/**
 * The line the workspace shows when a stage's confirm was refused. Presentation
 * matches `CloseStageLoadError` on purpose — both are one line of stage copy,
 * and the ticket for this seam asked for the same inline Alert rather than a
 * toast (#233). They stay separate components: "the load failed" and "the
 * confirm is blocked" are different facts a reader should not have to untangle.
 */
export const CloseStageBlockedNotice: React.FC<CloseStageBlockedNoticeProps> = ({ reason }) => {
  if (!reason) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {reason}
    </p>
  );
};
