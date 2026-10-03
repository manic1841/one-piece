import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Dialog, DialogContent } from '@/ui/components/ui/dialog';

import { ConfirmDialogBody } from './ConfirmDialogBody';
import { type ConfirmOptions, resolveConfirmOptions } from './resolveConfirmOptions';
import { ConfirmContext } from './useConfirm';

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((input: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setContent(resolveConfirmOptions(input));
      setOpen(true);
    });
  }, []);

  const settle = useCallback((confirmed: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    resolver?.(confirmed);
    setOpen(false);
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) settle(false);
        }}
      >
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <ConfirmDialogBody
            options={content}
            onConfirm={() => settle(true)}
            onCancel={() => settle(false)}
          />
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
};
