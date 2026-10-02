import * as React from 'react';

import { cn } from '@/ui/utils/cn';

type ModuleProps = {
  /** Mono uppercase module label, e.g. "NET WORTH". */
  label: string;
  children?: React.ReactNode;
  className?: string;
};

/**
 * Distinct module inside a PageSection: a labeled boundary for one self-contained
 * unit (design-system: Card is reserved for distinct/interactive modules).
 * Keeps a min-w-0 guard so it can sit in responsive grids without overflowing.
 */
export function Module({ label, children, className }: ModuleProps) {
  return (
    <div className={cn('min-w-0 rounded-lg border border-border bg-card p-5', className)}>
      <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
