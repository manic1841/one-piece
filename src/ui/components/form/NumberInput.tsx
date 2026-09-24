import * as React from 'react';

import { Input } from '@/ui/components/ui/input';
import { numberInputSpinnerClass } from '@/ui/components/ui/input-styles';
import { cn } from '@/ui/utils/cn';

import { fieldInputClass, fieldInputErrorClass, fieldNumberInputClass } from './styles';

export interface NumberInputProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  value?: string;
  /** Emits the raw field value as a string; coercion happens at the schema boundary. */
  onChange?: (value: string) => void;
  error?: boolean;
}

/**
 * RHF-free numeric field. Shares geometry and numeric handling with the
 * data-table number input (34px, mono, `tabular-nums`, no native spinner) but
 * keeps the form surface.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, error, value, onChange, ...props }, ref) => (
    <Input
      ref={ref}
      type="number"
      inputMode="decimal"
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value)}
      className={cn(
        fieldInputClass,
        numberInputSpinnerClass,
        fieldNumberInputClass,
        error && fieldInputErrorClass,
        className,
      )}
      {...props}
    />
  ),
);
NumberInput.displayName = 'NumberInput';
