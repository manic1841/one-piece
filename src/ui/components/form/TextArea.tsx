import * as React from 'react';

import { Textarea } from '@/ui/components/ui/textarea';
import { cn } from '@/ui/utils/cn';

import { fieldInputErrorClass } from './styles';

export interface TextAreaProps
  extends Omit<React.ComponentProps<'textarea'>, 'value' | 'onChange'> {
  value?: string;
  /** Emits the field value (a string), not the DOM event. */
  onChange?: (value: string) => void;
  error?: boolean;
}

/** RHF-free multiline field; mirrors `TextInput` so `FormControl` can inject it. */
export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, error, value, onChange, ...props }, ref) => (
    <Textarea
      ref={ref}
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value)}
      className={cn('min-h-[80px]', error && fieldInputErrorClass, className)}
      {...props}
    />
  ),
);
TextArea.displayName = 'TextArea';
