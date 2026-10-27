import { eyebrowClass } from '@/ui/components/eyebrow';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/ui/components/form';
import { NumberInput, TextInput } from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { EVENT_LABELS, EVENT_TYPE_LABELS } from '@/ui/constants/retirement/eventLabels';
import { WORKSPACE_ACTION_LABELS } from '@/ui/constants/retirement/workspaceRailLabels';
import {
  type LifeEventDraftVM,
  type PhaseDraftVM,
} from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';

interface LifeEventInspectorProps {
  event: LifeEventDraftVM;
  phase: PhaseDraftVM;
  eventIndex: number;
  readOnly: boolean;
  errors: {
    name?: string;
    startYear?: string;
    endYear?: string;
    amount?: string;
    growthRate?: string;
  };
  updateEvent: (patch: Partial<Omit<LifeEventDraftVM, 'phases'>>) => void;
  updatePhase: (patch: Partial<PhaseDraftVM>) => void;
  removePhase: () => void;
}

/** Precise fields for the selected phase; the timeline cannot reach these. */
export function LifeEventInspector({
  event,
  phase,
  eventIndex,
  readOnly,
  errors,
  updateEvent,
  updatePhase,
  removePhase,
}: LifeEventInspectorProps) {
  const prefix = `events.${eventIndex}`;
  const phaseIndex = event.phases.findIndex((candidate) => candidate.id === phase.id);
  const phasePrefix = `${prefix}.phases.${phaseIndex}`;

  return (
    <div className="grid gap-3" data-testid="life-event-inspector">
      <p className={eyebrowClass}>
        {WORKSPACE_ACTION_LABELS.INSPECTOR} · {EVENT_TYPE_LABELS[event.type]}
      </p>

      <FormField name={`${prefix}.name`}>
        <FormItem>
          <FormLabel>{EVENT_LABELS.NAME}</FormLabel>
          <FormControl>
            <TextInput readOnly={readOnly} onChange={(name) => updateEvent({ name })} />
          </FormControl>
          <FormMessage>{errors.name}</FormMessage>
        </FormItem>
      </FormField>

      <FormField name={`${phasePrefix}.name`}>
        <FormItem>
          <FormLabel>{EVENT_LABELS.PHASE_NAME}</FormLabel>
          <FormControl>
            <TextInput readOnly={readOnly} onChange={(name) => updatePhase({ name })} />
          </FormControl>
          <FormMessage>{errors.name}</FormMessage>
        </FormItem>
      </FormField>

      <div className="grid grid-cols-2 gap-2">
        <FormField name={`${phasePrefix}.startYearText`}>
          <FormItem>
            <FormLabel>{EVENT_LABELS.START_YEAR}</FormLabel>
            <FormControl>
              <NumberInput
                readOnly={readOnly}
                step={1}
                onChange={(startYearText) => updatePhase({ startYearText })}
              />
            </FormControl>
            <FormMessage>{errors.startYear}</FormMessage>
          </FormItem>
        </FormField>

        <FormField name={`${phasePrefix}.endYearText`}>
          <FormItem>
            <FormLabel>{EVENT_LABELS.END_YEAR}</FormLabel>
            <FormControl>
              <NumberInput
                readOnly={readOnly}
                step={1}
                onChange={(endYearText) => updatePhase({ endYearText })}
              />
            </FormControl>
            <FormMessage>{errors.endYear}</FormMessage>
          </FormItem>
        </FormField>
      </div>

      <FormField name={`${phasePrefix}.amountText`}>
        <FormItem>
          <FormLabel>{EVENT_LABELS.AMOUNT}</FormLabel>
          <FormControl>
            <NumberInput
              readOnly={readOnly}
              onChange={(amountText) => updatePhase({ amountText })}
            />
          </FormControl>
          <FormMessage>{errors.amount}</FormMessage>
        </FormItem>
      </FormField>

      <FormField name={`${phasePrefix}.growthRateText`}>
        <FormItem>
          <FormLabel>{EVENT_LABELS.GROWTH_RATE}</FormLabel>
          <FormControl>
            <NumberInput
              readOnly={readOnly}
              onChange={(growthRateText) => updatePhase({ growthRateText })}
            />
          </FormControl>
          <FormMessage>{errors.growthRate}</FormMessage>
        </FormItem>
      </FormField>

      {!readOnly && (
        <Button variant="text" size="sm" className="justify-start" onClick={removePhase}>
          {EVENT_LABELS.DELETE_PHASE}
        </Button>
      )}
    </div>
  );
}
