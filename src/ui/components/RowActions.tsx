import * as React from 'react';

import { Trash2 } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import { cn } from '@/ui/utils/cn';

type RowActionsProps = {
  /** The edit control (usually a dialog trigger), rendered before the delete button. */
  edit?: React.ReactNode;
  onDelete: () => void;
  /** Accessible name for the delete button. */
  deleteLabel: string;
  className?: string;
};

/**
 * End-of-row edit + delete pair for an editable list. The edit side is a node
 * because it is usually a dialog trigger; delete is the destructive icon button.
 */
export function RowActions({ edit, onDelete, deleteLabel, className }: RowActionsProps) {
  return (
    <div className={cn('flex shrink-0 items-center gap-2', className)}>
      {edit}
      <Button
        variant="ghost"
        size="icon"
        aria-label={deleteLabel}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
