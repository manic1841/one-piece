import React from 'react';

import { X } from 'lucide-react';

type DrawerPanelProps = {
  title: string;
  description?: string;
  onClose?: () => void;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  /** Radix sheet context only exists inside SheetContent; simulated previews render semantic headings instead. */
  inline?: boolean;
};

/**
 * The drawer's inner panel content, renderable inside a Radix SheetContent
 * (real drawer) or inline in a simulated scene — the real drawer and the
 * preview show the exact same surface.
 */
export const DrawerPanel: React.FC<DrawerPanelProps> = ({
  title,
  description,
  onClose,
  footer,
  children,
  inline = false,
}) => {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        {inline ? (
          <div>
            <p className="text-lg font-semibold text-foreground">{title}</p>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground">{title}</p>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {children}
      {footer && <div className="mt-auto flex gap-3 pt-5">{footer}</div>}
    </>
  );
};
