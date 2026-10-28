import { Button } from '@/ui/components/ui/button';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import { type Readiness } from '@/ui/features/retirement/viewmodels/workspaceReadiness.vm';
import { cn } from '@/ui/utils/cn';

interface WorkspaceActionBarProps {
  preview: boolean;
  readiness: Readiness;
  calculating: boolean;
  canSave: boolean;
  onCalculate: () => void;
  /** Preview only: the header back leaves the route, this rewinds the stage. */
  onBack: () => void;
  onSave: () => void;
}

/**
 * The fixed decision bar. Only the decision itself lives here: the blockers are
 * explained on the section bands they belong to, so the bar carries CALCULATE
 * and nothing to re-read. Mobile keeps its summary in `WorkspacePinnedBar`.
 * Leaving the workspace belongs to the page header, so the bar only rewinds
 * preview → setup.
 */
export function WorkspaceActionBar({
  preview,
  readiness,
  calculating,
  canSave,
  onCalculate,
  onBack,
  onSave,
}: WorkspaceActionBarProps) {
  return (
    <div
      data-testid="workspace-action-bar"
      className={cn(
        'material-chrome flex flex-wrap items-center gap-3 border-t border-border pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]',
        preview ? 'justify-between' : 'justify-end',
      )}
    >
      {preview && (
        <Button variant="text" onClick={onBack}>
          {PROJECTION_WORKSPACE_LABELS.BACK_TO_SETUP}
        </Button>
      )}

      {preview ? (
        <Button onClick={onSave} disabled={!canSave}>
          {PROJECTION_WORKSPACE_LABELS.SAVE}
        </Button>
      ) : (
        <Button onClick={onCalculate} disabled={!readiness.ready || calculating}>
          {calculating
            ? PROJECTION_WORKSPACE_LABELS.CALCULATING
            : PROJECTION_WORKSPACE_LABELS.CALCULATE}
        </Button>
      )}
    </div>
  );
}
