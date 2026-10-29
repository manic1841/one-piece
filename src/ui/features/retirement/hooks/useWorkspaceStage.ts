import { useCallback, useState } from 'react';

export type ProjectionWorkspaceStage = 'setup' | 'preview';

/**
 * The workspace walks setup → preview inside one route. Switching never changes
 * the route and never drops the draft, so this is plain state; the shell adds
 * the calculation reset around it.
 */
export function useWorkspaceStage() {
  const [stage, setStage] = useState<ProjectionWorkspaceStage>('setup');

  const goToPreview = useCallback(() => setStage('preview'), []);
  const goToSetup = useCallback(() => setStage('setup'), []);

  return { stage, goToPreview, goToSetup };
}
