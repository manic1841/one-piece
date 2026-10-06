import React from 'react';

import { Alert, AlertDescription } from '@/ui/components/ui/alert';

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
    <Alert variant="destructive" className="mt-4">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};
