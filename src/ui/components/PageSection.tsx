import * as React from 'react';

import { StatusGlyph, type StatusGlyphType } from '@/ui/components/StatusGlyph';
import { sectionTitleClass } from '@/ui/components/eyebrow';
import { STATUS_GLYPH_LABELS } from '@/ui/constants/statusGlyphLabels';
import { cn } from '@/ui/utils/cn';

type PageSectionSpacing = 'default' | 'compact';

type PageSectionProps = {
  /** Mono uppercase section number, e.g. "01". */
  number?: string;
  /** Section heading shown next to the number. */
  title?: string;
  /** Optional trailing control aligned to the section heading. */
  action?: React.ReactNode;
  /** Section state. Callers pass it only when the state is worth reporting. */
  status?: StatusGlyphType;
  /** One-line reason hung under the heading, so a gap is explained where it is. */
  hint?: string;
  /** Test hook for the band itself. */
  testId?: string;
  /** Accessible name for the band; a named `<section>` becomes a landmark. */
  ariaLabel?: string;
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
 * plain band. `status` and `hint` report the band's own state so a blocker is
 * explained where the work happens instead of only in the action bar.
 */
export function PageSection({
  number,
  title,
  action,
  status,
  hint,
  testId,
  ariaLabel,
  spacing = 'default',
  children,
  className,
}: PageSectionProps) {
  const hasHeading = number !== undefined || title !== undefined;
  return (
    <section
      data-testid={testId}
      aria-label={ariaLabel}
      className={cn('border-b border-border', SPACING_CLASS[spacing], className)}
    >
      {(hasHeading || action !== undefined) && (
        <div className={cn(HEADER_MARGIN_CLASS[spacing])}>
          <div className="flex items-center justify-between gap-4">
            {hasHeading && (
              <p className={cn(sectionTitleClass, 'flex items-center gap-2')}>
                {status !== undefined && (
                  <>
                    <StatusGlyph type={status} label="" />
                    <span className="sr-only">{STATUS_GLYPH_LABELS[status]}</span>
                  </>
                )}
                {number !== undefined && title !== undefined
                  ? `${number} / ${title}`
                  : (number ?? title)}
              </p>
            )}
            {action}
          </div>
          {hint !== undefined && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
