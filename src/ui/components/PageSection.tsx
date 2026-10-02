import * as React from 'react';

import { cn } from '@/ui/utils/cn';

type PageSectionSpacing = 'default' | 'compact';

type PageSectionProps = {
  /** Mono uppercase section number, e.g. "01". */
  number?: string;
  /** Section heading shown next to the number. */
  title?: string;
  /** Optional trailing control aligned to the section heading. */
  action?: React.ReactNode;
  /** Vertical rhythm: `default` is the page band; `compact` tightens dense stacks. */
  spacing?: PageSectionSpacing;
  children?: React.ReactNode;
  className?: string;
};

const SPACING_CLASS: Record<PageSectionSpacing, string> = {
  default: 'py-10',
  compact: 'py-6',
};

const HEADER_MARGIN_CLASS: Record<PageSectionSpacing, string> = {
  default: 'mb-6',
  compact: 'mb-4',
};

/**
 * Full-width section band separating page regions (visual-standards: structure
 * over cards). Number + title is optional; content-only sections render as a
 * plain band.
 */
export function PageSection({
  number,
  title,
  action,
  spacing = 'default',
  children,
  className,
}: PageSectionProps) {
  const hasHeading = number !== undefined || title !== undefined;
  return (
    <section className={cn('border-b border-border', SPACING_CLASS[spacing], className)}>
      {(hasHeading || action !== undefined) && (
        <div
          className={cn('flex items-center justify-between gap-4', HEADER_MARGIN_CLASS[spacing])}
        >
          {hasHeading && (
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {number !== undefined && title !== undefined
                ? `${number} / ${title}`
                : (number ?? title)}
            </p>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
