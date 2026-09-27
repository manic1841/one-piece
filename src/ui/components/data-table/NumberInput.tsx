import * as React from 'react';

import { Input } from '@/ui/components/ui/input';
import { cn } from '@/ui/utils/cn';

import { numberInputClass, numberInputCompactClass, numberInputSpinnerClass } from './styles';

interface NumberInputProps extends Omit<React.ComponentPropsWithoutRef<'input'>, 'type'> {
  /** 子表格用的 32px 緊湊版（主表格為 34px）。 */
  compact?: boolean;
}

/**
 * 數字輸入框：右對齊等寬、等寬數字、無原生 spinner。
 * 寬度由呼叫端以 className 決定（各欄寬不同）。
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, compact = false, ...props }, ref) => (
    <Input
      ref={ref}
      type="number"
      inputMode="decimal"
      className={cn(
        numberInputSpinnerClass,
        compact ? numberInputCompactClass : numberInputClass,
        className,
      )}
      {...props}
    />
  ),
);
NumberInput.displayName = 'NumberInput';
