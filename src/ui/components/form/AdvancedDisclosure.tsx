import * as React from 'react';

import { ChevronDown } from 'lucide-react';

import { cn } from '@/ui/utils/cn';

import { disclosureBodyClass } from '../ui/disclosure-styles';

export type AdvancedDisclosureProps = {
  /** Trigger text, e.g. "Advanced". */
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Secondary fields, revealed only while open. */
  children: React.ReactNode;
  className?: string;
};

/**
 * Form-internal "Advanced" disclosure: a single bordered group whose header row
 * toggles secondary fields open. The header and body share one container, and the
 * body carries a `bg-muted/50` nested surface so they read as one control rather
 * than a button plus loose fields (visual-standards: 複雜設定預設隱藏). Not
 * `ui/accordion` — that is a section-level panel with a mono title row.
 *
 * The body stays mounted so it can animate out (motion-system §5.1): `height: auto
 * <-> 0` interpolates under `interpolate-size: allow-keywords`, so the content
 * height never has to be measured. `grid-rows-[0fr]` cannot be used here: with an
 * `auto` container the track rests at content height and springs back once the
 * animation ends. `inert` keeps the collapsed fields out of the tab order and the
 * a11y tree, which is what conditionally rendering used to do for free.
 */
export function AdvancedDisclosure({
  label,
  open,
  onOpenChange,
  children,
  className,
}: AdvancedDisclosureProps) {
  return (
    <div className={cn('rounded-md border', className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-t-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
      >
        {label}
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-fast ease-out-quint',
            open && 'rotate-180',
          )}
        />
      </button>
      <div data-state={open ? 'open' : 'closed'} inert={!open} className={disclosureBodyClass}>
        <div className="rounded-b-md bg-muted/50 px-3 py-3">
          <div className="grid gap-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
