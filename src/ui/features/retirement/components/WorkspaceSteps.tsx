import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import { type ProjectionWorkspaceStage } from '@/ui/features/retirement/hooks/useProjectionWorkspace';
import { cn } from '@/ui/utils/cn';

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
      className="grid grid-cols-1 gap-1 border-b border-border pb-4 md:grid-cols-2"
    >
      {steps.map((step) => {
        const isCurrent = step.id === stage;
        const isDone = step.id === 'setup' && stage === 'preview';

        return (
          <li key={step.id} className="flex min-w-0">
            <div
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex h-10 w-full items-center gap-2 px-2 text-xs',
                isCurrent ? 'bg-elevated text-foreground' : 'text-muted-foreground',
              )}
            >
              <StatusGlyph
                type={isDone ? 'verified' : isCurrent ? 'active' : 'waiting'}
                label=""
                className="shrink-0"
              />
              <span className="font-medium uppercase tracking-widest">{step.label}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
