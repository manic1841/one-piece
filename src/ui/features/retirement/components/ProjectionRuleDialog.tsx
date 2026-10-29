import { type ReactNode } from 'react';

import { Button } from '@/ui/components/ui/button';
import { sectionTitleClass } from '@/ui/components/eyebrow';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/ui/components/ui/sheet';
import { RULE_LABELS } from '@/ui/constants/retirement/setupLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';
import { cn } from '@/ui/utils/cn';

interface ProjectionRuleDialogProps {
  open: boolean;
  /** `create` grades the title and hides DELETE; the rule itself lives in the form either way. */
  mode: 'create' | 'edit';
  title: string;
  readOnly: boolean;
  /** Disabled while the name is blank, so confirming never adds an unusable row. */
  confirmDisabled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDelete: () => void;
  children: ReactNode;
}

/**
 * Hosts the rule fields. Desktop centres a dialog; mobile docks a near-full-height
 * sheet, matching how `04 LIFE EVENTS` sends its inspector to a sheet on narrow
 * screens. The body is the same `ProjectionRuleInspector` in both.
 */
export function ProjectionRuleDialog({
  open,
  mode,
  title,
  readOnly,
  confirmDisabled,
  onConfirm,
  onCancel,
  onDelete,
  children,
}: ProjectionRuleDialogProps) {
  const isDesktop = useIsDesktop();

  const body = (
    <div className="grid gap-5">
      <div className="grid gap-5">{children}</div>
      {!readOnly && (
        <div className="flex items-center gap-2 border-t border-border pt-4">
          <Button variant="text" size="sm" className="px-0" onClick={onDelete}>
            {RULE_LABELS.DELETE}
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={onCancel}>
              {RULE_LABELS.CANCEL}
            </Button>
            <Button onClick={onConfirm} disabled={confirmDisabled} data-testid="rule-confirm">
              {mode === 'create' ? RULE_LABELS.CREATE : RULE_LABELS.DONE}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
        <DialogContent aria-describedby={undefined} className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={cn(sectionTitleClass, 'text-muted-foreground')}>
              {title}
            </DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onCancel()}>
      <SheetContent side="bottom" className={cn('max-h-[92vh] overflow-y-auto')}>
        <SheetHeader>
          <SheetTitle className={cn(sectionTitleClass, 'text-muted-foreground')}>
            {title}
          </SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  );
}
