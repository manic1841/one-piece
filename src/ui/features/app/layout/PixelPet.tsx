import React, { useEffect, useState } from 'react';

import clsx from 'clsx';
import { NavLink } from 'react-router-dom';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/ui/components/ui/sheet';

import PetAvatar from './PetAvatar';
import { NAVIGATOR_ITEMS } from './navigation';
import { PET_REACTIONS, type PetReaction } from './petReaction';
import { useIsDesktop } from './useIsDesktop';

type PixelPetProps = {
  reaction?: PetReaction;
};

const NAVIGATOR_LINK_CLASS =
  'flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-muted-foreground transition-[color,background-color,transform] duration-fast ease-out-quint hover:bg-accent hover:text-foreground active:scale-[0.97]';

const navigatorLinkClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? clsx(NAVIGATOR_LINK_CLASS, 'text-primary bg-primary/10') : NAVIGATOR_LINK_CLASS;

const PixelPet: React.FC<PixelPetProps> = ({ reaction = 'idle' }) => {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const activeReaction = PET_REACTIONS.includes(reaction) ? reaction : 'idle';

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Pixel Pet"
        aria-expanded={open}
        data-reaction={activeReaction}
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-24 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-fast ease-out-quint hover:scale-105 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:bottom-8 md:right-8"
      >
        <PetAvatar reaction={activeReaction} />
      </button>
      {open && (
        <div
          data-testid="navigator-backdrop"
          aria-hidden="true"
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          onPointerDown={() => setOpen(false)}
        />
      )}
      {open && (
        <div
          data-testid="navigator"
          role="dialog"
          aria-label="Navigator"
          className="fixed hidden md:block z-50 bottom-24 right-8 w-80 rounded-lg border border-border bg-elevated shadow-xl p-4 animate-in fade-in zoom-in-95 duration-base"
        >
          <p className="text-xs font-medium text-muted-foreground tracking-heading mb-3">
            NAVIGATOR
          </p>
          <div data-navigator-grid className="grid grid-cols-2 md:grid-cols-4 gap-2 md:w-72">
            {NAVIGATOR_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={navigatorLinkClassName}
              >
                <Icon size={18} />
                <span className="text-xs font-medium text-center leading-tight">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
      {!isDesktop && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            data-testid="navigator-sheet"
            aria-label="Navigator"
            className="md:hidden rounded-t-2xl"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onPointerDownOutside={(event) => {
              const target = event.detail.originalEvent.target;
              if (target instanceof Element && target.closest('[aria-label="Pixel Pet"]')) {
                event.preventDefault();
              }
            }}
          >
            <SheetHeader>
              <SheetTitle>Navigator</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-2 pb-4">
              {NAVIGATOR_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={navigatorLinkClassName}
                >
                  <Icon size={18} />
                  <span className="text-xs font-medium text-center leading-tight">{label}</span>
                </NavLink>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};

export default PixelPet;
