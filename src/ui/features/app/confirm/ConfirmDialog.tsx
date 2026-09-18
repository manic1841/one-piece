import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { Button } from '@/ui/components/ui/button';

export interface ConfirmOptions {
  title: string;
  context?: string;
  consequence?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

const DEFAULT_CONSEQUENCE = 'This action cannot be undone.';
const DEFAULT_CONFIRM_LABEL = 'DELETE';
const DEFAULT_CANCEL_LABEL = 'Cancel';

export const resolveConfirmOptions = (input: ConfirmOptions | string): ConfirmOptions => {
  if (typeof input === 'string') {
    return {
      title: input,
      consequence: DEFAULT_CONSEQUENCE,
      confirmLabel: DEFAULT_CONFIRM_LABEL,
      cancelLabel: DEFAULT_CANCEL_LABEL,
    };
  }

  return {
    title: input.title,
    context: input.context,
    consequence: input.consequence ?? DEFAULT_CONSEQUENCE,
    confirmLabel: input.confirmLabel ?? DEFAULT_CONFIRM_LABEL,
    cancelLabel: input.cancelLabel ?? DEFAULT_CANCEL_LABEL,
  };
};

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export const useConfirm = (): ConfirmContextValue => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmDialogProvider');
  }
  return context;
};

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((input: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setOptions(resolveConfirmOptions(input));
    });
  }, []);

  const settle = useCallback((confirmed: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    resolver?.(confirmed);
    setOptions(null);
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog
        open={options != null}
        onOpenChange={(open) => {
          if (!open) settle(false);
        }}
      >
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{options?.title}</DialogTitle>
            {options?.context && (
              <DialogDescription>{options.context}</DialogDescription>
            )}
          </DialogHeader>
          {options?.consequence && (
            <p className="text-sm text-muted-foreground">{options.consequence}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => settle(false)}>
              {options?.cancelLabel ?? DEFAULT_CANCEL_LABEL}
            </Button>
            <Button variant="destructive" onClick={() => settle(true)}>
              {options?.confirmLabel ?? DEFAULT_CONFIRM_LABEL}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
};
