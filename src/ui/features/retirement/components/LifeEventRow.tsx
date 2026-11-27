import { useId } from 'react';

import { ChevronDown, Trash2 } from 'lucide-react';

import { formMessageClass } from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { disclosureBodyClass } from '@/ui/components/ui/disclosure-styles';
import { Switch } from '@/ui/components/ui/switch';
import {
  EVENT_LABELS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_TONE,
} from '@/ui/constants/retirement/eventLabels';
import { LifeEventPhaseRow } from '@/ui/features/retirement/components/LifeEventPhaseRow';
import {
  type EventErrors,
  type LifeEventDraftVM,
  eventTitle,
} from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';
import { cn } from '@/ui/utils/cn';

interface LifeEventRowProps {
  event: LifeEventDraftVM;
  errors: EventErrors;
  readOnly: boolean;
  /** Collapsed by default; the section expands the event it selects. */
  expanded: boolean;
  selectedPhaseId: string | null;
  onToggleExpand: () => void;
  onSelectPhase: (phaseId: string) => void;
  remove: () => void;
  toggle: () => void;
  addPhase: () => void;
}

/**
 * One life event, collapsed to a summary line. The header is the disclosure
 * trigger; the body lists the event's phases, and a phase click opens the
 * inspector. Nothing here is an input except the enabled switch, so an event
 * with several phases costs one line instead of a form. There is deliberately
 * no source picker: amounts are typed and events never appear in a rule's
 * percentage source list.
 */
export function LifeEventRow({
  event,
  errors,
  readOnly,
  expanded,
  selectedPhaseId,
  onToggleExpand,
  onSelectPhase,
  remove,
  toggle,
  addPhase,
}: LifeEventRowProps) {
  const bodyId = useId();
  const phaseErrorCount = Object.values(errors.phaseErrors ?? {}).reduce(
    (total, phaseErrors) => total + Object.keys(phaseErrors).length,
    0,
  );
  const errorCount =
    phaseErrorCount +
    (errors.name === undefined ? 0 : 1) +
    (errors.type === undefined ? 0 : 1) +
    (errors.phases === undefined ? 0 : 1);
  const unnamed = event.name.trim() === '';

  return (
    <li data-testid="event-row" className="grid gap-1 border-b border-border pb-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          aria-controls={bodyId}
          // The visible summary is replaced by the aria-label, so the name, type,
          // count and error total have to be spelled out again here.
          aria-label={[
            expanded ? EVENT_LABELS.COLLAPSE : EVENT_LABELS.EXPAND,
            eventTitle(event),
            EVENT_TYPE_LABELS[event.type],
            EVENT_LABELS.PHASE_COUNT(event.phases.length),
            errorCount > 0 ? EVENT_LABELS.ERROR_COUNT.replace('{count}', String(errorCount)) : null,
          ]
            .filter((part) => part !== null)
            .join(', ')}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left',
            'hover:bg-muted/50 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          )}
        >
          <span className="grid min-w-0 flex-1 gap-1">
            <span className={cn('truncate text-sm', unnamed && 'text-muted-foreground')}>
              {eventTitle(event)}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn('size-1.5 shrink-0 rounded-full', EVENT_TYPE_TONE[event.type].dot)}
                aria-hidden="true"
              />
              <span className={cn('font-mono', EVENT_TYPE_TONE[event.type].text)}>
                {EVENT_TYPE_LABELS[event.type]}
              </span>
              <span aria-hidden="true">{EVENT_LABELS.META_SEPARATOR}</span>
              <span>{EVENT_LABELS.PHASE_COUNT(event.phases.length)}</span>
            </span>
          </span>
          {errorCount > 0 && (
            <span
              className="text-destructive shrink-0 font-mono text-xs tabular-nums"
              aria-label={EVENT_LABELS.ERROR_COUNT.replace('{count}', String(errorCount))}
              data-testid="event-error-count"
            >
              {errorCount}
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-fast',
              expanded && 'rotate-180',
            )}
          />
        </button>

        <Switch
          checked={event.enabled}
          onCheckedChange={toggle}
          disabled={readOnly}
          aria-label={EVENT_LABELS.ENABLED}
        />

        {!readOnly && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={EVENT_LABELS.DELETE}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={remove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div
        id={bodyId}
        data-state={expanded ? 'open' : 'closed'}
        inert={!expanded}
        className={disclosureBodyClass}
      >
        <div className="grid gap-2 px-2 pt-1">
          {event.phases.length === 0 ? (
            <p className="text-sm text-muted-foreground">{EVENT_LABELS.PHASES_EMPTY}</p>
          ) : (
            <ul className="grid gap-1 pl-2">
              {event.phases.map((phase) => (
                <LifeEventPhaseRow
                  key={phase.id}
                  phase={phase}
                  errors={errors.phaseErrors?.[phase.id] ?? {}}
                  selected={phase.id === selectedPhaseId}
                  onSelect={() => onSelectPhase(phase.id)}
                />
              ))}
            </ul>
          )}

          {!readOnly && (
            <div className="pl-2">
              <Button variant="outline" size="sm" onClick={addPhase}>
                {EVENT_LABELS.ADD_PHASE}
              </Button>
            </div>
          )}

          {errors.name !== undefined && <p className={formMessageClass}>{errors.name}</p>}
          {errors.type !== undefined && <p className={formMessageClass}>{errors.type}</p>}
          {errors.phases !== undefined && <p className={formMessageClass}>{errors.phases}</p>}
        </div>
      </div>
    </li>
  );
}
