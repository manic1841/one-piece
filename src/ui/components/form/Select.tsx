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

/** Sentinel item value standing in for the field's empty string; Radix forbids ''. */
const NONE_VALUE = '__none__';

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
  /** Label for the "no value" row; Radix Select forbids the empty string as an item value. */
  noneLabel?: string;
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
>(
  (
    { value, onChange, onBlur, options, placeholder, noneLabel, error, className, ...props },
    ref,
  ) => {
    if (import.meta.env.DEV && noneLabel === undefined) {
      for (const option of options) {
        if (option.value === '') {
          throw new Error(
            'SelectField received an option with an empty value; pass `noneLabel` to render the "no value" row',
          );
        }
      }
    }

    const normalValue = value ?? '';
    const selectValue = normalValue === '' && noneLabel !== undefined ? NONE_VALUE : normalValue;
    const rows =
      noneLabel === undefined
        ? options
        : [
            { value: NONE_VALUE, label: noneLabel },
            ...options.filter((option) => option.value !== ''),
          ];

    return (
      <Select
        value={selectValue}
        onValueChange={(next) => onChange?.(next === NONE_VALUE ? '' : next)}
      >
        <SelectTrigger
          ref={ref}
          onBlur={onBlur}
          className={cn(fieldInputClass, error && fieldInputErrorClass, className)}
          {...props}
        >
          <SelectValue placeholder={placeholder ?? noneLabel} />
        </SelectTrigger>
        <SelectContent>
          {rows.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  },
);
SelectField.displayName = 'SelectField';
