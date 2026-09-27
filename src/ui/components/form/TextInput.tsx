import * as React from 'react';

import { Input } from '@/ui/components/ui/input';
import { cn } from '@/ui/utils/cn';

import { fieldInputClass, fieldInputErrorClass } from './styles';

export interface TextInputProps extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> {
  value?: string;
  /** Emits the field value (a string), not the DOM event. */
  onChange?: (value: string) => void;
  error?: boolean;
}

/** RHF-free text field. Usable standalone: `<TextInput value={v} onChange={setV} />`. */
export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, error, value, onChange, ...props }, ref) => (
    <Input
      ref={ref}
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value)}
      className={cn(fieldInputClass, error && fieldInputErrorClass, className)}
      {...props}
    />
  ),
);
TextInput.displayName = 'TextInput';
