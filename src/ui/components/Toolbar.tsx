import * as React from 'react';

import { cn } from '@/ui/utils/cn';

type ToolbarProps = {
  /** Action group on the trailing side, e.g. primary page actions. */
  actions?: React.ReactNode;
  /** Data-view controls on the leading side, e.g. selection count, filters. */
  children?: React.ReactNode;
  className?: string;
};

/** Page toolbar row: data-view controls lead, actions trail. Keeps the two groups separate. */
export function Toolbar({ actions, children, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        'flex min-h-10 items-center justify-between gap-4 border-b border-border py-2',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">{children}</div>
      <div className="flex shrink-0 items-center gap-2">{actions}</div>
    </div>
  );
}
