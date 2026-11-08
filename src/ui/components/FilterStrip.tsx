import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { buttonVariants } from './ui/button-variants';

export type FilterStripItem = {
  id: string;
  label: string;
};

interface FilterStripProps {
  items: readonly FilterStripItem[];
  value: string;
  onValueChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
}

export const FilterStrip: React.FC<FilterStripProps> = ({
  items,
  value,
  onValueChange,
  ariaLabel,
  className,
}) => (
  <div role="group" aria-label={ariaLabel} className={cn('inline-flex items-center', className)}>
    {items.map((item, index) => {
      const isFirst = index === 0;
      const isLast = index === items.length - 1;
      return (
        <button
          key={item.id}
          type="button"
          aria-pressed={item.id === value}
          onClick={() => onValueChange(item.id)}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'text-muted-foreground aria-pressed:text-primary aria-pressed:bg-elevated',
            isFirst && !isLast && 'rounded-r-none border-r-0',
            isLast && !isFirst && 'rounded-l-none border-l-0',
            !isFirst && !isLast && 'rounded-none border-x-0',
          )}
        >
          {item.label}
        </button>
      );
    })}
  </div>
);
FilterStrip.displayName = 'FilterStrip';
