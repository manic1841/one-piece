import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import { type ProjectionWorkspaceStage } from '@/ui/features/retirement/types/workspaceTypes';

interface WorkspaceStepsProps {
  stage: ProjectionWorkspaceStage;
}

/** Two fixed stages inside the single route; the step rail never navigates. */
export function WorkspaceSteps({ stage }: WorkspaceStepsProps) {
  const steps = [
    { id: 'setup' as const, label: PROJECTION_WORKSPACE_LABELS.STEP_SETUP },
    { id: 'preview' as const, label: PROJECTION_WORKSPACE_LABELS.STEP_PREVIEW },
  ];

  return (
    <ol
      aria-label={PROJECTION_WORKSPACE_LABELS.STEPS_ARIA_LABEL}
      className="flex items-center gap-2 border-b border-border pb-3 text-xs"
    >
      {steps.map((step) => {
        const isCurrent = step.id === stage;
        const isDone = step.id === 'setup' && stage === 'preview';

        return (
          <li key={step.id} className="flex items-center gap-2">
            <div
              aria-current={isCurrent ? 'step' : undefined}
              className={
                isCurrent
                  ? 'flex items-center gap-2 text-foreground'
                  : 'flex items-center gap-2 text-muted-foreground'
              }
            >
              <StatusGlyph
                type={isDone ? 'verified' : isCurrent ? 'active' : 'waiting'}
                label=""
                className="shrink-0"
              />
              <span className="font-medium uppercase tracking-widest">{step.label}</span>
            </div>
            {step.id === 'setup' && (
              <span aria-hidden="true" className="text-muted-foreground">
                →
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
