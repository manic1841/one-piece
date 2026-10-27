import { Button } from '@/ui/components/ui/button';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import {
  READINESS_BLOCKER_LABELS,
  WORKSPACE_ACTION_LABELS,
  WORKSPACE_RAIL_LABELS,
} from '@/ui/constants/retirement/workspaceRailLabels';
import { type Readiness } from '@/ui/features/retirement/viewmodels/workspaceReadiness.vm';

interface WorkspaceActionBarProps {
  preview: boolean;
  readiness: Readiness;
  canUndo: boolean;
  calculating: boolean;
  canSave: boolean;
  onCancel: () => void;
  onUndo: () => void;
  onCalculate: () => void;
  onBack: () => void;
  onSave: () => void;
}

/** The fixed decision bar. Setup carries Cancel, Undo, readiness and CALCULATE. */
export function WorkspaceActionBar({
  preview,
  readiness,
  canUndo,
  calculating,
  canSave,
  onCancel,
  onUndo,
  onCalculate,
  onBack,
  onSave,
}: WorkspaceActionBarProps) {
  const blockerText = readiness.blockers
    .map((blocker) => READINESS_BLOCKER_LABELS[blocker])
    .join(' ');

  return (
    <div
      data-testid="workspace-action-bar"
      className="material-chrome flex flex-wrap items-center justify-between gap-3 border-t border-border py-3"
    >
      <div className="flex items-center gap-2">
        {preview ? (
          <Button variant="outline" onClick={onBack}>
            {PROJECTION_WORKSPACE_LABELS.BACK_TO_SETUP}
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onCancel}>
              {WORKSPACE_ACTION_LABELS.CANCEL}
            </Button>
            <Button variant="text" onClick={onUndo} disabled={!canUndo}>
              {WORKSPACE_ACTION_LABELS.UNDO}
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!preview && (
          <p className="hidden max-w-md text-right text-xs text-muted-foreground md:block">
            {readiness.ready ? WORKSPACE_RAIL_LABELS.READY : blockerText}
          </p>
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
    </div>
  );
}
