import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { NumberInput, type NumberInputProps } from './NumberInput';

export interface CurrencyInputProps extends NumberInputProps {
  /** Currency symbol/prefix shown inside the field; supplied by the caller. */
  prefix?: string;
}

/**
 * RHF-free currency field: a numeric input with an optional currency prefix.
 * It deliberately carries no built-in currency symbol — the caller owns which
 * currency is being entered (the USD/TWD formatting question is a separate
 * decision).
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ prefix, className, ...props }, ref) => (
    <div className="relative">
      {prefix ? (
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
          {prefix}
        </span>
      ) : null}
      <NumberInput ref={ref} className={cn(prefix && 'pl-9', className)} {...props} />
    </div>
  ),
);
CurrencyInput.displayName = 'CurrencyInput';
