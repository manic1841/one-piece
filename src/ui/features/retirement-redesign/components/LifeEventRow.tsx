import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  SelectField,
  TextInput,
} from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { Switch } from '@/ui/components/ui/switch';
import { EVENT_LABELS, EVENT_TYPE_LABELS } from '@/ui/constants/retirement-redesign/eventLabels';
import { LifeEventPhaseRow } from '@/ui/features/retirement-redesign/components/LifeEventPhaseRow';
import {
  type EventErrors,
  type EventType,
  type LifeEventDraftVM,
  type PhaseDraftVM,
  type PhaseFocusRequest,
} from '@/ui/features/retirement-redesign/viewmodels/lifeEventForm.vm';

interface LifeEventRowProps {
  index: number;
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

const TYPE_OPTIONS = Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/**
 * One life event. There is deliberately no source picker: amounts are typed
 * and events never appear in a rule's percentage source list.
 */
export function LifeEventRow({
  index,
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
  const prefix = `events.${index}`;

  return (
    <li data-testid="event-row" className="grid gap-3 border-b border-border pb-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <FormField name={`${prefix}.name`}>
            <FormItem>
              <FormLabel>{EVENT_LABELS.NAME}</FormLabel>
              <FormControl>
                <TextInput readOnly={readOnly} onChange={(name) => update({ name })} />
              </FormControl>
              <FormMessage>{errors.name}</FormMessage>
            </FormItem>
          </FormField>
        </div>

        <label className="flex h-[34px] items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={event.enabled} onCheckedChange={toggle} disabled={readOnly} />
          {event.enabled ? EVENT_LABELS.ENABLED : EVENT_LABELS.DISABLED}
        </label>

        {!readOnly && (
          <Button variant="text" size="sm" onClick={remove}>
            {EVENT_LABELS.DELETE}
          </Button>
        )}
      </div>

      <div className="sm:max-w-xs">
        <FormField name={`${prefix}.type`}>
          <FormItem>
            <FormLabel>{EVENT_LABELS.TYPE}</FormLabel>
            <FormControl>
              <SelectField
                value={event.type}
                onChange={(value) => setType(value as EventType)}
                options={TYPE_OPTIONS}
                disabled={readOnly}
              />
            </FormControl>
            <FormMessage>{errors.type}</FormMessage>
          </FormItem>
        </FormField>
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
                eventIndex={index}
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

        {errors.phases && <p className="text-destructive text-sm font-medium">{errors.phases}</p>}
      </div>
    </li>
  );
}
