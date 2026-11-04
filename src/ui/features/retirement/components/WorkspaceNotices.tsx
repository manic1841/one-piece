import { Link } from 'react-router-dom';

import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';

interface WorkspaceNoticesProps {
  /** Result of the last SAVE / SAVE AS PLAN; shown in both stages. */
  savedAsPlan: boolean;
  savedId: string | null;
}

/**
 * The save confirmations under the workspace. They belong to the workspace,
 * not to a stage, so both branches render the same pair.
 */
export function WorkspaceNotices({ savedAsPlan, savedId }: WorkspaceNoticesProps) {
  return (
    <>
      {savedAsPlan && (
        <Alert data-testid="saved-as-plan-message">
          <AlertDescription>
            {PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_SAVED_MESSAGE}
          </AlertDescription>
        </Alert>
      )}

      {savedId !== null && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{PROJECTION_WORKSPACE_LABELS.SAVED_MESSAGE}</span>
            <Link
              to={`/retirement/projections/${savedId}`}
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              {PROJECTION_WORKSPACE_LABELS.SAVED_LINK}
            </Link>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
