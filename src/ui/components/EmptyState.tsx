import * as React from 'react';

import { eyebrowClass } from '@/ui/components/eyebrow';
import { cn } from '@/ui/utils/cn';

type EmptyStateProps = {
  /** Status marker line, e.g. "NO TRANSACTIONS". */
  title: string;
  /** One sentence: what is missing, why it matters, what to do next. */
  description: string;
  /** The single next action. */
  action?: React.ReactNode;
  className?: string;
};

/** Empty state: status + one sentence + one action. No illustrations, no large card. */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center py-8 text-center', className)}>
      <span aria-hidden="true" className="font-mono text-xl text-muted-foreground">
        ○
      </span>
      <span className={cn('mt-3', eyebrowClass)}>{title}</span>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      {action !== undefined && <div className="mt-4">{action}</div>}
    </div>
  );
}
