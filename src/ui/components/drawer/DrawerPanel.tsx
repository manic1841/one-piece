import React from 'react';

import { X } from 'lucide-react';

import { SheetDescription, SheetHeader, SheetTitle } from '@/ui/components/ui/sheet';
import { cn } from '@/ui/utils/cn';

/** Keep in sync with the sheet parts in `ui/sheet.tsx` (parity is asserted in `DrawerPanel.test.tsx`). */
const HEADER_CLASS = 'flex flex-col space-y-2 text-center sm:text-left';
const TITLE_CLASS = 'text-lg font-semibold text-foreground';
const DESCRIPTION_CLASS = 'text-sm text-muted-foreground';
const CLOSE_CLASS =
  'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary';
const FOOTER_CLASS = 'mt-auto flex gap-3 pt-5';

type DrawerPanelProps = {
  title: string;
  description?: string;
  /** Live drawers let `SheetContent` own the close control; only inline previews draw their own. */
  onClose?: () => void;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  /** Title typography override, applied identically in both branches. */
  titleClassName?: string;
  /** Radix sheet context only exists inside SheetContent; inline previews render semantic elements instead. */
  inline?: boolean;
};

export const DrawerPanel: React.FC<DrawerPanelProps> = ({
  title,
  description,
  onClose,
  footer,
  children,
  titleClassName,
  inline = false,
}) => {
  if (inline) {
    return (
      <>
        {onClose && (
          <button type="button" onClick={onClose} className={CLOSE_CLASS}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
        <div className={HEADER_CLASS}>
          <h3 className={cn(TITLE_CLASS, titleClassName)}>{title}</h3>
          {description && <p className={DESCRIPTION_CLASS}>{description}</p>}
        </div>
        {children}
        {footer && <div className={FOOTER_CLASS}>{footer}</div>}
      </>
    );
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className={titleClassName}>{title}</SheetTitle>
        {description && <SheetDescription>{description}</SheetDescription>}
      </SheetHeader>
      {children}
      {footer && <div className={FOOTER_CLASS}>{footer}</div>}
    </>
  );
};
