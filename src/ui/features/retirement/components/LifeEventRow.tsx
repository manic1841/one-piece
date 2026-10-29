import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  TextInput,
  formMessageClass,
} from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { Switch } from '@/ui/components/ui/switch';
import {
  EVENT_LABELS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_TONE,
} from '@/ui/constants/retirement/eventLabels';
import { LifeEventPhaseRow } from '@/ui/features/retirement/components/LifeEventPhaseRow';
import {
  type EventErrors,
  type EventType,
  type LifeEventDraftVM,
  type PhaseDraftVM,
  type PhaseFocusRequest,
} from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';
import { cn } from '@/ui/utils/cn';

interface LifeEventRowProps {
  event: LifeEventDraftVM;
  errors: EventErrors;
  readOnly: boolean;
  focusRequest: PhaseFocusRequest | null;
  update: (patch: Partial<Omit<LifeEventDraftVM, 'phases'>>) => void;
  remove: () => void;
  toggle: () => void;
  addPhase: () => void;
  removePhase: (phaseId: string) => void;
  updatePhase: (phaseId: string, patch: Partial<PhaseDraftVM>) => void;
  setType: (type: EventType) => void;
}

/**
 * One life event. There is deliberately no source picker: amounts are typed
 * and events never appear in a rule's percentage source list.
 */
export function LifeEventRow({
  event,
  errors,
  readOnly,
  focusRequest,
  update,
  remove,
  toggle,
  addPhase,
  removePhase,
  updatePhase,
  setType,
}: LifeEventRowProps) {
  const prefix = `eventsById.${event.id}`;

  return (
    <li data-testid="event-row" className="grid gap-3 border-b border-border pb-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <FormField name={`${prefix}.name`}>
            <FormItem>
              <FormLabel required size="compact">{EVENT_LABELS.NAME}</FormLabel>
              <FormControl>
                <TextInput readOnly={readOnly} onChange={(name) => update({ name })} />
              </FormControl>
              <FormMessage>{errors.name}</FormMessage>
            </FormItem>
          </FormField>
        </div>

        <label className="flex h-[34px] items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={event.enabled} onCheckedChange={toggle} disabled={readOnly} />
          {event.enabled ? EVENT_LABELS.ENABLED : EVENT_LABELS.DISABLED}
        </label>

        {!readOnly && (
          <Button variant="destructive" size="sm" onClick={remove}>
            {EVENT_LABELS.DELETE}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {EVENT_LABELS.TYPE}
          <Switch
            checked={event.type === 'expense'}
            onCheckedChange={(expense) => setType(expense ? 'expense' : 'income')}
            disabled={readOnly}
            error={errors.type !== undefined}
          />
          <span className={cn('font-mono text-sm', EVENT_TYPE_TONE[event.type].text)}>
            {EVENT_TYPE_LABELS[event.type]}
          </span>
        </label>
        {errors.type && <p className={formMessageClass}>{errors.type}</p>}
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{EVENT_LABELS.PHASES}</span>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={addPhase}>
              {EVENT_LABELS.ADD_PHASE}
            </Button>
          )}
        </div>

        {event.phases.length === 0 ? (
          <p className="text-sm text-muted-foreground">{EVENT_LABELS.PHASES_EMPTY}</p>
        ) : (
          <ul className="grid gap-3">
            {event.phases.map((phase) => (
              <LifeEventPhaseRow
                key={phase.id}
                eventId={event.id}
                phase={phase}
                errors={errors.phaseErrors?.[phase.id] ?? {}}
                readOnly={readOnly}
                focusRequest={focusRequest}
                update={(patch) => updatePhase(phase.id, patch)}
                remove={() => removePhase(phase.id)}
              />
            ))}
          </ul>
        )}

        {errors.phases && <p className={formMessageClass}>{errors.phases}</p>}
      </div>
    </li>
  );
}
