import { Trash2 } from 'lucide-react';

import { Divider } from '@/ui/components/Divider';
import { sectionTitleClass } from '@/ui/components/eyebrow';
import { Button } from '@/ui/components/ui/button';
import { cn } from '@/ui/utils/cn';

interface DangerZoneProps {
  /** Destructive action label, e.g. "刪除貸款". */
  actionLabel: string;
  onAction: () => void;
  className?: string;
}

/** Page-end danger section: red divider, red heading, destructive action (ui-layer-architecture §7.6). */
export function DangerZone({ actionLabel, onAction, className }: DangerZoneProps) {
  return (
    <section className={cn('space-y-3 pt-10', className)}>
      <Divider className="border-destructive" />
      <p className={cn(sectionTitleClass, 'text-destructive')}>DANGER ZONE</p>
      <Button variant="destructive" onClick={onAction}>
        <Trash2 size={14} aria-hidden="true" />
        {actionLabel}
      </Button>
    </section>
  );
}
