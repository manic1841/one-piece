import React from 'react';

import { Button } from '@/ui/components/ui/button';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';

import {
  type ConfirmOptions,
  DEFAULT_CANCEL_LABEL,
  DEFAULT_CONFIRM_LABEL,
  resolveConfirmOptions,
} from './resolveConfirmOptions';

type ConfirmDialogBodyProps = {
  options: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
  /** Radix dialog context only exists inside DialogContent; inline previews render semantic headings instead. */
  inline?: boolean;
};

/**
 * The dialog's inner panel content, renderable inside a Radix DialogContent
 * (modal) or inline in a page section — the modal and the section preview
 * show the exact same surface.
 */
export const ConfirmDialogBody: React.FC<ConfirmDialogBodyProps> = ({
  options,
  onConfirm,
  onCancel,
  inline = false,
}) => {
  const resolved = options ? resolveConfirmOptions(options) : null;

  const statusLine = resolved?.status;
  const consequenceLine = resolved?.consequence && (
    <p className="text-sm text-muted-foreground">{resolved.consequence}</p>
  );
  const footer = (
    <DialogFooter className="mt-auto">
      <Button variant="outline" onClick={onCancel}>
        {resolved?.cancelLabel ?? DEFAULT_CANCEL_LABEL}
      </Button>
      <Button
        variant={resolved?.confirmTone === 'primary' ? 'default' : 'destructive'}
        onClick={onConfirm}
      >
        {resolved?.confirmLabel ?? DEFAULT_CONFIRM_LABEL}
      </Button>
    </DialogFooter>
  );

  if (inline) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <DialogHeader>
          <h3 className="text-lg font-semibold leading-none tracking-tight">{resolved?.title}</h3>
          {resolved?.context && <p className="text-sm text-muted-foreground">{resolved.context}</p>}
        </DialogHeader>
        {statusLine}
        {consequenceLine}
        {footer}
      </div>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{resolved?.title}</DialogTitle>
        {resolved?.context && <DialogDescription>{resolved.context}</DialogDescription>}
      </DialogHeader>
      {statusLine}
      {consequenceLine}
      {footer}
    </>
  );
};
