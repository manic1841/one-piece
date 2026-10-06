import * as React from 'react';

import { Label } from '@/ui/components/ui/label';
import { cn } from '@/ui/utils/cn';

export type ReadoutFieldProps = {
  /** Field label, above the value box. */
  label: string;
  value: React.ReactNode;
  className?: string;
};

/**
 * Read-only derived value shown in the field lane: label over a bordered box
 * sized like an input. Use for values the form computes (growth, duration)
 * rather than inputs.
 */
export function ReadoutField({ label, value, className }: ReadoutFieldProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Label>{label}</Label>
      <div className="rounded-md border px-3 py-2 text-sm">{value}</div>
    </div>
  );
}
