import { useEffect } from 'react';

import { NumberInput, TextInput } from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { Label } from '@/ui/components/ui/label';
import { EVENT_LABELS } from '@/ui/constants/retirement-redesign/eventLabels';
import {
  type PhaseDraftVM,
  type PhaseErrorField,
  type PhaseErrors,
  type PhaseFocusRequest,
} from '@/ui/features/retirement-redesign/hooks/useLifeEventDrafts';

interface LifeEventPhaseRowProps {
  eventId: string;
  phase: PhaseDraftVM;
  errors: PhaseErrors;
  readOnly: boolean;
  focusRequest: PhaseFocusRequest | null;
  update: (patch: Partial<PhaseDraftVM>) => void;
  remove: () => void;
}

function errorText(errors: PhaseErrors, field: PhaseErrorField) {
  const error = errors[field];
  if (!error) return null;
  return <p className="text-destructive text-sm font-medium">{error}</p>;
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
  const idFor = (field: PhaseErrorField) => `event-${eventId}-phase-${phase.id}-${field}`;

  useEffect(() => {
    if (focusRequest?.eventId !== eventId || focusRequest.phaseId !== phase.id) return;
    document.getElementById(`event-${eventId}-phase-${phase.id}-${focusRequest.field}`)?.focus();
    // `sequence` makes a repeated request on the same field focus again.
  }, [eventId, focusRequest, phase.id]);

  return (
    <li data-testid="phase-row" className="grid gap-3 border-t border-border pt-3">
      <div className="flex items-end gap-2">
        <div className="grid flex-1 gap-2">
          <Label htmlFor={idFor('name')}>{EVENT_LABELS.PHASE_NAME}</Label>
          <TextInput
            id={idFor('name')}
            value={phase.name}
            onChange={(name) => update({ name })}
            readOnly={readOnly}
            error={!!errors.name}
            aria-invalid={!!errors.name}
          />
          {errorText(errors, 'name')}
        </div>

        {!readOnly && (
          <Button variant="text" size="sm" onClick={remove}>
            {EVENT_LABELS.DELETE_PHASE}
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={idFor('startYear')}>{EVENT_LABELS.START_YEAR}</Label>
          <NumberInput
            id={idFor('startYear')}
            value={phase.startYearText}
            onChange={(startYearText) => update({ startYearText })}
            readOnly={readOnly}
            step={1}
            error={!!errors.startYear}
            aria-invalid={!!errors.startYear}
          />
          {errorText(errors, 'startYear')}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={idFor('endYear')}>{EVENT_LABELS.END_YEAR}</Label>
          <NumberInput
            id={idFor('endYear')}
            value={phase.endYearText}
            onChange={(endYearText) => update({ endYearText })}
            readOnly={readOnly}
            step={1}
            error={!!errors.endYear}
            aria-invalid={!!errors.endYear}
          />
          {errorText(errors, 'endYear')}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={idFor('amount')}>{EVENT_LABELS.AMOUNT}</Label>
          <NumberInput
            id={idFor('amount')}
            value={phase.amountText}
            onChange={(amountText) => update({ amountText })}
            readOnly={readOnly}
            error={!!errors.amount}
            aria-invalid={!!errors.amount}
          />
          {errorText(errors, 'amount')}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={idFor('growthRate')}>{EVENT_LABELS.GROWTH_RATE}</Label>
          <NumberInput
            id={idFor('growthRate')}
            value={phase.growthRateText}
            onChange={(growthRateText) => update({ growthRateText })}
            readOnly={readOnly}
            error={!!errors.growthRate}
            aria-invalid={!!errors.growthRate}
          />
          <p className="text-sm text-muted-foreground">{EVENT_LABELS.GROWTH_RATE_HINT}</p>
          {errorText(errors, 'growthRate')}
        </div>
      </div>
    </li>
  );
}
