import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { tabTriggerBaseClass } from './ui/tabs-styles';

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
  <div
    role="group"
    aria-label={ariaLabel}
    className={cn('inline-flex items-center gap-6', className)}
  >
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        aria-pressed={item.id === value}
        onClick={() => onValueChange(item.id)}
        className={cn(
          tabTriggerBaseClass,
          'aria-pressed:border-primary aria-pressed:font-semibold aria-pressed:text-foreground',
        )}
      >
        {item.label}
      </button>
    ))}
  </div>
);
FilterStrip.displayName = 'FilterStrip';
