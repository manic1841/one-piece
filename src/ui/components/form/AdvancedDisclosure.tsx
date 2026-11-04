import * as React from 'react';

import { ChevronDown } from 'lucide-react';

import { cn } from '@/ui/utils/cn';

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
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="grid gap-4 rounded-b-md bg-muted/50 px-3 py-3">{children}</div>
      ) : null}
    </div>
  );
}
