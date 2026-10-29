import { useId } from 'react';

import { eyebrowClass } from '@/ui/components/eyebrow';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
  SelectField,
  TextInput,
} from '@/ui/components/form';
import { Label } from '@/ui/components/ui/label';
import { Switch } from '@/ui/components/ui/switch';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import {
  EVENT_LABELS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_TONE,
} from '@/ui/constants/retirement/eventLabels';
import { usePhaseFieldFocus } from '@/ui/features/retirement/components/usePhaseFieldFocus';
import {
  type EventErrors,
  type EventType,
  type LifeEventDraftVM,
  type PhaseDraftVM,
  type PhaseErrors,
  type PhaseFocusRequest,
} from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';
import { RETIREMENT_YEAR_OPTIONS } from '@/ui/features/retirement/viewmodels/numberOptions.vm';

/** Status dot + type text, matching the timeline bar tones. */
interface LifeEventInspectorProps {
  event: LifeEventDraftVM;
  phase: PhaseDraftVM;
  readOnly: boolean;
  /** Null while another surface owns error focus. */
  focusRequest: PhaseFocusRequest | null;
  /** Event-level messages; phase messages live in `errors`. */
  eventErrors: EventErrors;
  errors: PhaseErrors;
  /** Every event, current one included, so the select shows the current owner. */
  eventOptions: { value: string; label: string }[];
  updateEvent: (patch: Partial<Omit<LifeEventDraftVM, 'phases'>>) => void;
  updatePhase: (patch: Partial<PhaseDraftVM>) => void;
  setType: (type: EventType) => void;
  onReparent: (targetEventId: string) => void;
}

/**
 * Precise fields for the selected phase and its event. The heading and delete
 * actions live on the hosting `DrawerPanel`; these fields stack in a sheet and
 * sit side by side in the desktop inspector.
 */
export function LifeEventInspector({
  event,
  phase,
  readOnly,
  focusRequest,
  eventErrors,
  errors,
  eventOptions,
  updateEvent,
  updatePhase,
  setType,
  onReparent,
}: LifeEventInspectorProps) {
  const prefix = `eventsById.${event.id}`;
  // Id-keyed like the events: re-sorting never moves a field between paths.
  const phasePrefix = `${prefix}.phasesById.${phase.id}`;
  const containerRef = usePhaseFieldFocus<HTMLDivElement>(focusRequest, event.id, phase.id);
  const periodLabelId = useId();

  return (
    <div
      ref={containerRef}
      className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-5"
      data-testid="life-event-inspector"
    >
      <section className="grid content-start gap-3 border-b border-border pb-4 md:border-r md:border-b-0 md:pr-5 md:pb-0">
        <p className={eyebrowClass}>{EVENT_LABELS.EVENT_SECTION}</p>
        <div className="grid gap-3">
          <FormField name={`${prefix}.name`}>
            <FormItem>
              <FormLabel required size="compact" className="block">
                {EVENT_LABELS.NAME}
              </FormLabel>
              <FormControl>
                <TextInput readOnly={readOnly} onChange={(name) => updateEvent({ name })} />
              </FormControl>
              <FormMessage>{eventErrors.name}</FormMessage>
            </FormItem>
          </FormField>
          <FormField name={`${prefix}.type`}>
            <FormItem>
              <FormLabel required size="compact" className="block">
                {EVENT_LABELS.TYPE}
              </FormLabel>
              <FormControl>
                <label className="flex h-[34px] items-center gap-2 text-xs">
                  <Switch
                    checked={event.type === 'expense'}
                    onCheckedChange={(expense) => setType(expense ? 'expense' : 'income')}
                    disabled={readOnly}
                    aria-label={EVENT_LABELS.TYPE}
                  />
                  <span className={EVENT_TYPE_TONE[event.type].text}>
                    {EVENT_TYPE_LABELS[event.type]}
                  </span>
                </label>
              </FormControl>
              <FormMessage>{eventErrors.type}</FormMessage>
            </FormItem>
          </FormField>
        </div>
      </section>

      <section className="grid content-start gap-3">
        <p className={eyebrowClass}>{EVENT_LABELS.PHASE_SECTION}</p>
        {!readOnly && eventOptions.length > 1 && (
          <label className="grid gap-1.5 text-xs">
            <span>{EVENT_LABELS.BELONGS_TO}</span>
            <SelectField
              aria-label={EVENT_LABELS.BELONGS_TO}
              value={event.id}
              options={eventOptions}
              onChange={onReparent}
            />
          </label>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <FormField name={`${phasePrefix}.name`}>
            <FormItem>
              <FormLabel required size="compact" className="block">
                {EVENT_LABELS.PHASE_NAME}
              </FormLabel>
              <FormControl>
                <TextInput readOnly={readOnly} onChange={(name) => updatePhase({ name })} />
              </FormControl>
              <FormMessage>{errors.name}</FormMessage>
            </FormItem>
          </FormField>

          {/* Same label/control rhythm as FormItem so Period lines up with Phase name. */}
          <div role="group" aria-labelledby={periodLabelId} className="space-y-2">
            <Label id={periodLabelId} size="compact" className="block">
              {EVENT_LABELS.PERIOD}
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2">
              <FormField name={`${phasePrefix}.startYearText`}>
                <FormItem>
                  <FormControl>
                    <SelectField
                      value={phase.startYearText}
                      onChange={(startYearText) => updatePhase({ startYearText })}
                      options={RETIREMENT_YEAR_OPTIONS}
                      placeholder={PROJECTION_COMMON_LABELS.DASH}
                      disabled={readOnly}
                      aria-label={EVENT_LABELS.START_YEAR}
                    />
                  </FormControl>
                  <FormMessage>{errors.startYear}</FormMessage>
                </FormItem>
              </FormField>
              <span className="flex h-[34px] items-center text-muted-foreground" aria-hidden="true">
                {EVENT_LABELS.PERIOD_SEPARATOR}
              </span>
              <FormField name={`${phasePrefix}.endYearText`}>
                <FormItem>
                  <FormControl>
                    <SelectField
                      value={phase.endYearText}
                      onChange={(endYearText) => updatePhase({ endYearText })}
                      options={RETIREMENT_YEAR_OPTIONS}
                      placeholder={PROJECTION_COMMON_LABELS.DASH}
                      disabled={readOnly}
                      aria-label={EVENT_LABELS.END_YEAR}
                    />
                  </FormControl>
                  <FormMessage>{errors.endYear}</FormMessage>
                </FormItem>
              </FormField>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:col-span-2">
            <FormField name={`${phasePrefix}.amountText`}>
              <FormItem>
                <FormLabel required size="compact" className="block">
                  {EVENT_LABELS.AMOUNT}
                </FormLabel>
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
                <FormLabel size="compact" className="block">
                  {EVENT_LABELS.GROWTH_RATE}
                </FormLabel>
                <FormControl>
                  <NumberInput
                    readOnly={readOnly}
                    onChange={(growthRateText) => updatePhase({ growthRateText })}
                  />
                </FormControl>
                <FormMessage>{errors.growthRate}</FormMessage>
              </FormItem>
            </FormField>
          </div>
        </div>
      </section>
    </div>
  );
}
