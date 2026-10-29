import { type ChangeEvent, forwardRef } from 'react';

import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';

interface PercentSliderProps {
  /** Raw percentage text; blank leaves the thumb at the track midpoint. */
  value?: string;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  error?: boolean;
  /** Off when the caller already shows the value next to the field label. */
  showReadout?: boolean;
  id?: string;
  name?: string;
  onChange?: (value: string) => void;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/**
 * A percentage as a slider plus its numeric readout. The track and thumb are
 * drawn from the design tokens (`bg-muted` track, `bg-primary` thumb) rather
 * than the browser's `accent-color`, so the control matches `progress` and
 * `switch`. The range comes from the domain bounds, so the thumb can only
 * produce values the schema accepts; four-decimal typing stays possible
 * elsewhere and an off-step value still renders at its own position.
 *
 * A blank value is not snapped to `min` — it reads as a dash so "unset" and
 * "zero" stay distinguishable.
 */
export const PercentSlider = forwardRef<HTMLInputElement, PercentSliderProps>(
  function PercentSlider(
    {
      value = '',
      min,
      max,
      step = 0.1,
      disabled = false,
      error = false,
      showReadout = true,
      onChange,
      ...props
    },
    ref,
  ) {
    return (
      <span className="flex items-center gap-3">
        <input
          {...props}
          ref={ref}
          type="range"
          className="bg-muted focus-visible:ring-ring focus-visible:ring-offset-background h-1 w-full cursor-pointer appearance-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-valuetext={value === '' ? '' : `${value}%`}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange?.(event.target.value)}
        />
        {showReadout && (
          <span className="w-14 shrink-0 text-right font-mono text-sm tabular-nums">
            {value === '' ? PROJECTION_COMMON_LABELS.DASH : `${value}%`}
          </span>
        )}
        {error && <span className="sr-only">{PROJECTION_COMMON_LABELS.INVALID}</span>}
      </span>
    );
  },
);
