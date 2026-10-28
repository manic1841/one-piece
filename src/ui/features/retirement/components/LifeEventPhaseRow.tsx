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
import { Button } from '@/ui/components/ui/button';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { EVENT_LABELS } from '@/ui/constants/retirement/eventLabels';
import { usePhaseFieldFocus } from '@/ui/features/retirement/components/usePhaseFieldFocus';
import {
  type PhaseDraftVM,
  type PhaseErrors,
  type PhaseFocusRequest,
} from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';
import { RETIREMENT_YEAR_OPTIONS } from '@/ui/features/retirement/viewmodels/numberOptions.vm';

interface LifeEventPhaseRowProps {
  eventId: string;
  phase: PhaseDraftVM;
  errors: PhaseErrors;
  readOnly: boolean;
  focusRequest: PhaseFocusRequest | null;
  update: (patch: Partial<PhaseDraftVM>) => void;
  remove: () => void;
}

/** One phase; blank starts sort last and overlap focus lands on the year input. */
export function LifeEventPhaseRow({
  eventId,
  phase,
  errors,
  readOnly,
  focusRequest,
  update,
  remove,
}: LifeEventPhaseRowProps) {
  const prefix = `eventsById.${eventId}.phasesById.${phase.id}`;
  const rowRef = usePhaseFieldFocus<HTMLLIElement>(focusRequest, eventId, phase.id);

  return (
    <li ref={rowRef} data-testid="phase-row" className="grid gap-3 border-t border-border pt-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <FormField name={`${prefix}.name`}>
            <FormItem>
              <FormLabel>{EVENT_LABELS.PHASE_NAME}</FormLabel>
              <FormControl>
                <TextInput readOnly={readOnly} onChange={(name) => update({ name })} />
              </FormControl>
              <FormMessage>{errors.name}</FormMessage>
            </FormItem>
          </FormField>
        </div>

        {!readOnly && (
          <Button variant="text" size="sm" onClick={remove}>
            {EVENT_LABELS.DELETE_PHASE}
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name={`${prefix}.startYearText`}>
          <FormItem>
            <FormLabel>{EVENT_LABELS.START_YEAR}</FormLabel>
            <FormControl>
              <SelectField
                value={phase.startYearText}
                onChange={(startYearText) => update({ startYearText })}
                options={RETIREMENT_YEAR_OPTIONS}
                placeholder={PROJECTION_COMMON_LABELS.DASH}
                disabled={readOnly}
              />
            </FormControl>
            <FormMessage>{errors.startYear}</FormMessage>
          </FormItem>
        </FormField>

        <FormField name={`${prefix}.endYearText`}>
          <FormItem>
            <FormLabel>{EVENT_LABELS.END_YEAR}</FormLabel>
            <FormControl>
              <SelectField
                value={phase.endYearText}
                onChange={(endYearText) => update({ endYearText })}
                options={RETIREMENT_YEAR_OPTIONS}
                placeholder={PROJECTION_COMMON_LABELS.DASH}
                disabled={readOnly}
              />
            </FormControl>
            <FormMessage>{errors.endYear}</FormMessage>
          </FormItem>
        </FormField>

        <FormField name={`${prefix}.amountText`}>
          <FormItem>
            <FormLabel>{EVENT_LABELS.AMOUNT}</FormLabel>
            <FormControl>
              <NumberInput readOnly={readOnly} onChange={(amountText) => update({ amountText })} />
            </FormControl>
            <FormMessage>{errors.amount}</FormMessage>
          </FormItem>
        </FormField>

        <FormField name={`${prefix}.growthRateText`}>
          <FormItem>
            <FormLabel>{EVENT_LABELS.GROWTH_RATE}</FormLabel>
            <FormControl>
              <NumberInput
                readOnly={readOnly}
                onChange={(growthRateText) => update({ growthRateText })}
              />
            </FormControl>
            <p className="text-sm text-muted-foreground">{EVENT_LABELS.GROWTH_RATE_HINT}</p>
            <FormMessage>{errors.growthRate}</FormMessage>
          </FormItem>
        </FormField>
      </div>
    </li>
  );
}
