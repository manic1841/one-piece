import { useEffect } from 'react';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
  TextInput,
} from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { EVENT_LABELS } from '@/ui/constants/retirement/eventLabels';
import {
  type PhaseDraftVM,
  type PhaseErrors,
  type PhaseFocusRequest,
} from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';

const FIELD_NAMES = {
  name: 'name',
  startYear: 'startYearText',
  endYear: 'endYearText',
  amount: 'amountText',
  growthRate: 'growthRateText',
} as const;

interface LifeEventPhaseRowProps {
  eventIndex: number;
  phase: PhaseDraftVM;
  errors: PhaseErrors;
  readOnly: boolean;
  focusRequest: PhaseFocusRequest | null;
  update: (patch: Partial<PhaseDraftVM>) => void;
  remove: () => void;
}

/** One phase; blank starts sort last and overlap focus lands on the year input. */
export function LifeEventPhaseRow({
  eventIndex,
  phase,
  errors,
  readOnly,
  focusRequest,
  update,
  remove,
}: LifeEventPhaseRowProps) {
  const prefix = `events.${eventIndex}.phasesById.${phase.id}`;

  useEffect(() => {
    if (focusRequest === null || focusRequest.phaseId !== phase.id) return;
    document
      .querySelector<HTMLInputElement>(`[name="${prefix}.${FIELD_NAMES[focusRequest.field]}"]`)
      ?.focus();
    // `sequence` makes a repeated request on the same field focus again.
  }, [focusRequest, phase.id, prefix]);

  return (
    <li data-testid="phase-row" className="grid gap-3 border-t border-border pt-3">
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
              <NumberInput
                readOnly={readOnly}
                step={1}
                onChange={(startYearText) => update({ startYearText })}
              />
            </FormControl>
            <FormMessage>{errors.startYear}</FormMessage>
          </FormItem>
        </FormField>

        <FormField name={`${prefix}.endYearText`}>
          <FormItem>
            <FormLabel>{EVENT_LABELS.END_YEAR}</FormLabel>
            <FormControl>
              <NumberInput
                readOnly={readOnly}
                step={1}
                onChange={(endYearText) => update({ endYearText })}
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
