import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';
import { cn } from '@/ui/utils/cn';

import { fieldInputClass, fieldInputErrorClass } from './styles';

export interface SelectFieldOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  value?: string;
  /** Emits the selected value (a string), matching the field value contract. */
  onChange?: (value: string) => void;
  onBlur?: () => void;
  options: SelectFieldOption[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/**
 * RHF-free select. Wraps the styled `ui/select` parts and exposes the same
 * string value contract as the text/number fields, so `FormControl` can inject
 * it uniformly.
 */
export const SelectField = React.forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  SelectFieldProps
>(({ value, onChange, onBlur, options, placeholder, error, className, ...props }, ref) => (
  <Select value={value ?? ''} onValueChange={(next) => onChange?.(next)}>
    <SelectTrigger
      ref={ref}
      onBlur={onBlur}
      className={cn(fieldInputClass, error && fieldInputErrorClass, className)}
      {...props}
    >
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {options.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
));
SelectField.displayName = 'SelectField';
