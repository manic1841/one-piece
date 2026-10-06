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
 * Form-internal "Advanced" disclosure: a field-shaped bordered toggle that
 * reveals secondary fields (visual-standards: 複雜設定預設隱藏). Not
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
    <div className={cn('grid gap-2', className)}>
      <button
        type="button"
        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm font-medium"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
      >
        {label}
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="grid gap-4">{children}</div>}
    </div>
  );
}
