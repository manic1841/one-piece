import { forwardRef, useId } from 'react';

import { Label } from '@/ui/components/ui/label';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { ASSUMPTION_LABELS } from '@/ui/constants/retirement/setupLabels';
import { WORKSPACE_RAIL_LABELS } from '@/ui/constants/retirement/workspaceRailLabels';

interface RetirementAgeSliderProps
  extends Omit<React.ComponentPropsWithoutRef<'input'>, 'type' | 'value' | 'onChange'> {
  value: string;
  min: number;
  max: number;
  retirementYear: number | null;
  error?: string;
  readOnly: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Retirement age as a slider. The derived retirement year sits on the same
 * line so the age never has to be converted by hand. Schema validation stays
 * the last gate; the slider only guarantees an operable range. It forwards the
 * ref and the injected a11y attributes through to the native input.
 */
export const RetirementAgeSlider = forwardRef<HTMLInputElement, RetirementAgeSliderProps>(
  function RetirementAgeSlider(
    { value, min, max, retirementYear, error, readOnly, onChange, id, ...rest },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const numeric = Number(value);
    const current = Number.isFinite(numeric) && value.trim() !== '' ? numeric : min;

    return (
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={inputId}>{ASSUMPTION_LABELS.RETIREMENT_AGE}</Label>
          <span className="font-mono text-sm tabular-nums" data-testid="retirement-year">
            {WORKSPACE_RAIL_LABELS.RETIREMENT_YEAR}{' '}
            {retirementYear === null ? PROJECTION_COMMON_LABELS.DASH : retirementYear}
          </span>
        </div>
        <span className="flex items-center gap-2">
          <input
            {...rest}
            ref={ref}
            id={inputId}
            type="range"
            className="h-1 w-full accent-primary"
            min={min}
            max={max}
            step={1}
            value={current}
            disabled={readOnly}
            aria-valuetext={value === '' ? '' : String(current)}
            onChange={onChange}
          />
          <span className="w-8 text-right font-mono text-sm tabular-nums">
            {value || PROJECTION_COMMON_LABELS.DASH}
          </span>
        </span>
        {error !== undefined && <p className="text-destructive text-xs">{error}</p>}
      </div>
    );
  },
);
