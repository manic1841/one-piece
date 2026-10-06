import * as React from 'react';

import { cn } from '@/ui/utils/cn';

type ListSectionHeaderProps = {
  title: string;
  /** Optional item count, rendered as "(n)". */
  count?: number;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Title + count + actions row above a list section. The section title class is
 * decided here; vertical margin belongs to the caller.
 */
export function ListSectionHeader({ title, count, actions, className }: ListSectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <h3 className="text-sm font-semibold">
        {count === undefined ? title : `${title} (${count})`}
      </h3>
      {actions !== undefined && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
