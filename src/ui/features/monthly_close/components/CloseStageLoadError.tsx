import React from 'react';

interface CloseStageLoadErrorProps {
  /** The stage's canned load-failure copy; null while the load has not failed. */
  message: string | null;
}

/**
 * The one line a self-loading stage shows when its evidence failed to load. A
 * stage that shows nothing on failure looks identical to a stage with clean
 * evidence, so the copy lives here instead of being dropped silently.
 */
export const CloseStageLoadError: React.FC<CloseStageLoadErrorProps> = ({ message }) => {
  if (!message) return null;
  return (
    <p className="pt-4 text-sm text-destructive" role="alert">
      {message}
    </p>
  );
};
