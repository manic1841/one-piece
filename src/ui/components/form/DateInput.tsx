import * as React from 'react';

import { Input } from '@/ui/components/ui/input';
import { cn } from '@/ui/utils/cn';

import { fieldInputClass, fieldInputErrorClass } from './styles';

export interface DateInputProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  /** ISO `yyyy-MM-dd`. */
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
}

/** RHF-free date field emitting an ISO `yyyy-MM-dd` string. */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, error, value, onChange, ...props }, ref) => (
    <Input
      ref={ref}
      type="date"
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value)}
      className={cn(fieldInputClass, error && fieldInputErrorClass, className)}
      {...props}
    />
  ),
);
DateInput.displayName = 'DateInput';
