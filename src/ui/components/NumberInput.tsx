import * as React from 'react';

import { Input } from '@/ui/components/ui/input';
import { numberInputSpinnerClass } from '@/ui/components/ui/input-styles';
import { cn } from '@/ui/utils/cn';

import { numberInputClass, numberInputCompactClass } from './data-table/styles';
import { fieldInputClass, fieldInputErrorClass, fieldNumberInputClass } from './form/styles';

/** `form` = general form field surface; `table` = in-row data-table surface. */
export type NumberInputSurface = 'form' | 'table';

export interface NumberInputProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  value?: string;
  /** Emits the raw field value as a string; coercion happens at the schema boundary. */
  onChange?: (value: string) => void;
  /** Surface variant. Both keep the shared 34px geometry and mono numerics. */
  surface?: NumberInputSurface;
  /** Table sub-table height (32px). Only meaningful with `surface="table"`. */
  compact?: boolean;
  /** Optional currency symbol/prefix shown inside the field; supplied by the caller. */
  prefix?: string;
  /** Error affordance, driven by the injected `error` boolean from `FormControl`. */
  error?: boolean;
}

/**
 * The single numeric input. The form suite (`components/form`) and the data-table
 * suite (`components/data-table`) both re-export it, so callers have one component
 * and one string value contract across screens (ADR-0065). The two suites keep
 * their own *surface* — form: `rounded-md` + `border-input` + `bg-background`
 * (the `ui/input` primitive); table: `rounded-none` + `border-border` + `bg-muted`
 * — selected explicitly via `surface`, while geometry (34px, `compact` 32px),
 * right-aligned mono `tabular-nums`, and native-spinner removal stay shared.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    { className, surface = 'form', compact = false, prefix, error, value, onChange, ...props },
    ref,
  ) => {
    const field = (
      <Input
        ref={ref}
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        onChange={(event) => onChange?.(event.target.value)}
        className={cn(
          numberInputSpinnerClass,
          surface === 'table'
            ? compact
              ? numberInputCompactClass
              : numberInputClass
            : cn(fieldInputClass, fieldNumberInputClass, error && fieldInputErrorClass),
          prefix && 'pl-9',
          className,
        )}
        {...props}
      />
    );

    if (!prefix) return field;

    return (
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
          {prefix}
        </span>
        {field}
      </div>
    );
  },
);
NumberInput.displayName = 'NumberInput';
