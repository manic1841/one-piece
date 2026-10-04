import * as React from 'react';

import { eyebrowClass } from '@/ui/components/eyebrow';
import { cn } from '@/ui/utils/cn';

interface CloseSectionHeadingProps {
  /** Mono eyebrow above the title, e.g. the step name or the evidence label. */
  eyebrow: string;
  /** Section title; omit for a label-only eyebrow. */
  title?: string;
  /** One-line note under the title. */
  note?: string;
  /** Optional trailing control or counter aligned to the heading. */
  trailing?: React.ReactNode;
  className?: string;
}

/** One section heading for every close surface: eyebrow (＋ optional title) and trailing slot. */
export const CloseSectionHeading: React.FC<CloseSectionHeadingProps> = ({
  eyebrow,
  title,
  note,
  trailing,
  className,
}) => (
  <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
    <div className="space-y-1">
      <p className={eyebrowClass}>{eyebrow}</p>
      {title !== undefined && (
        <h2 className="text-[22px] font-medium leading-tight text-foreground">{title}</h2>
      )}
      {note !== undefined && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
    {trailing}
  </div>
);
