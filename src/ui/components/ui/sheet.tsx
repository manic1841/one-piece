import * as React from 'react';

import * as SheetPrimitive from '@radix-ui/react-dialog';
import { type VariantProps, cva } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '@/ui/utils/cn';

import { CLOSE_BUTTON_CLASS } from './close-button';
import { useSheetDrag } from './useSheetDrag';

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-slow data-[state=closed]:duration-slow ease-out-quint data-[state=closed]:ease-in-quint',
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  'material-surface fixed z-50 gap-4 p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-slow data-[state=open]:duration-slow ease-out-quint data-[state=closed]:ease-in-quint',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 border-t rounded-t-2xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
        right:
          'inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm',
      },
    },
    defaultVariants: {
      side: 'bottom',
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /**
   * Bottom sheets drag closed by their handle (motion-system §5.3). The gesture
   * supplies only the motion: closing goes through the sheet's own close path.
   */
  draggable?: boolean;
}

const HANDLE_BAND_CLASS =
  'flex h-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing';
const HANDLE_CLASS = 'h-1 w-9 rounded-full bg-border-strong';

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = 'bottom', className, children, draggable = true, style, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const isDraggable = side === 'bottom' && draggable;
  // Dismiss goes through the close control's click so it takes the same path as
  // the visible one: the root's `onOpenChange`, and its focus return.
  const drag = useSheetDrag(contentRef, () => closeRef.current?.click());
  const { reset } = drag;

  // The portal mounts a fresh node on every open; the leftover offset from the
  // last dismissal would otherwise shove the new sheet back down. The ref prop
  // is rebuilt each render, so compare node identity rather than resetting on
  // every attach.
  const mounted = React.useRef<HTMLElement | null>(null);
  const attachContent = (node: HTMLDivElement | null) => {
    contentRef.current = node;
    if (node !== null && node !== mounted.current) {
      mounted.current = node;
      reset();
    }
  };

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={(node) => {
          attachContent(node);
          if (typeof ref === 'function') ref(node);
          else if (ref !== null) ref.current = node;
        }}
        className={cn(
          sheetVariants({ side }),
          // The drag gesture owns the exit transform, so the closed state must
          // not replay Radix's slide-out from zero (motion-system §5.3).
          isDraggable && 'flex max-h-[92vh] flex-col gap-0 p-0 data-[state=closed]:animate-none',
          isDraggable && !drag.dragging && 'transition-transform duration-slow ease-out-quint',
          drag.dragging && 'transition-none',
          className,
        )}
        data-sheet-content={isDraggable ? '' : undefined}
        style={
          isDraggable && drag.offset !== null
            ? { transform: `translateY(${drag.offset}px)`, ...style }
            : style
        }
        {...props}
      >
        {isDraggable && (
          <div aria-hidden data-sheet-handle className={HANDLE_BAND_CLASS} {...drag.handlers}>
            <span className={HANDLE_CLASS} />
          </div>
        )}
        <div
          data-sheet-body
          className={cn('flex min-h-0 flex-1 flex-col', isDraggable && 'overflow-y-auto px-6 pb-6')}
        >
          {children}
        </div>
        <SheetPrimitive.Close ref={closeRef} className={CLOSE_BUTTON_CLASS}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
);
SheetHeader.displayName = 'SheetHeader';

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
