import * as React from 'react';

import { cn } from '@/ui/utils/cn';

type PageSectionProps = {
  /** Mono uppercase section number, e.g. "01". */
  number?: string;
  /** Section heading shown next to the number. */
  title?: string;
  children?: React.ReactNode;
  className?: string;
};

/**
 * Full-width section band separating page regions (visual-standards: structure
 * over cards). Number + title is optional; content-only sections render as a
 * plain band.
 */
export function PageSection({ number, title, children, className }: PageSectionProps) {
  return (
    <section className={cn('border-b border-border py-10', className)}>
      {(number !== undefined || title !== undefined) && (
        <p className="mb-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {number !== undefined && title !== undefined ? `${number} / ${title}` : (number ?? title)}
        </p>
      )}
      {children}
    </section>
  );
}
