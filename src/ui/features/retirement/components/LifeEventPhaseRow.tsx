import { EVENT_LABELS } from '@/ui/constants/retirement/eventLabels';
import {
  type PhaseDraftVM,
  type PhaseErrors,
  phaseAmountText,
  phaseRangeText,
  phaseTitle,
} from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';
import { cn } from '@/ui/utils/cn';

interface LifeEventPhaseRowProps {
  phase: PhaseDraftVM;
  errors: PhaseErrors;
  /** The phase currently loaded into the inspector. */
  selected: boolean;
  onSelect: () => void;
}

/**
 * One phase as a summary line: name, years, amount. Selecting it opens the
 * inspector; the row holds no inputs, so a long phase list stays a list.
 */
export function LifeEventPhaseRow({ phase, errors, selected, onSelect }: LifeEventPhaseRowProps) {
  const errorCount = Object.keys(errors).length;
  const unnamed = phase.name.trim() === '';

  return (
    <li data-testid="phase-row">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        // The visible line is replaced by the aria-label, so the years, amount
        // and error total are repeated here.
        aria-label={[
          `${EVENT_LABELS.EDIT_PHASE}: ${phaseTitle(phase)}`,
          phaseRangeText(phase),
          phaseAmountText(phase),
          errorCount > 0 ? EVENT_LABELS.ERROR_COUNT.replace('{count}', String(errorCount)) : null,
        ]
          .filter((part) => part !== null)
          .join(', ')}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left',
          'hover:bg-muted/50 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          selected && 'bg-muted',
        )}
      >
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className={cn('truncate text-sm', unnamed && 'text-muted-foreground')}>
            {phaseTitle(phase)}
          </span>
          <span className="truncate font-mono text-xs tabular-nums text-muted-foreground">
            {phaseRangeText(phase)}
            {EVENT_LABELS.META_SEPARATOR}
            {phaseAmountText(phase)}
          </span>
        </span>
        {errorCount > 0 && (
          <span
            className="text-destructive shrink-0 font-mono text-xs tabular-nums"
            aria-label={EVENT_LABELS.ERROR_COUNT.replace('{count}', String(errorCount))}
            data-testid="phase-error-count"
          >
            {errorCount}
          </span>
        )}
      </button>
    </li>
  );
}
