import React, { useState } from 'react';

import clsx from 'clsx';
import { NavLink } from 'react-router-dom';

import { Popover, PopoverContent, PopoverTrigger } from '@/ui/components/ui/popover';
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

const FAB_CLASS =
  'fixed bottom-24 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-fast ease-out-quint hover:scale-105 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:bottom-8 md:right-8';

const NavigatorPanel: React.FC<{ gridClassName?: string; onNavigate: () => void }> = ({
  gridClassName,
  onNavigate,
}) => (
  <>
    <p className="text-xs font-medium text-muted-foreground tracking-heading mb-3">NAVIGATOR</p>
    <div data-navigator-grid className={clsx('grid grid-cols-2 gap-2', gridClassName)}>
      {NAVIGATOR_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} onClick={onNavigate} className={navigatorLinkClassName}>
          <Icon size={18} />
          <span className="text-xs font-medium text-center leading-tight">{label}</span>
        </NavLink>
      ))}
    </div>
  </>
);

const PixelPet: React.FC<PixelPetProps> = ({ reaction = 'idle' }) => {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const activeReaction = PET_REACTIONS.includes(reaction) ? reaction : 'idle';

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Pixel Pet"
            aria-expanded={open}
            data-reaction={activeReaction}
            className={FAB_CLASS}
          >
            <PetAvatar reaction={activeReaction} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={16}
          data-testid="navigator"
          aria-label="Navigator"
          className="w-80 rounded-lg border border-border bg-elevated p-4 shadow-xl"
        >
          <NavigatorPanel
            gridClassName="md:w-72 md:grid-cols-4"
            onNavigate={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Pixel Pet"
        aria-expanded={open}
        data-reaction={activeReaction}
        onClick={() => setOpen((prev) => !prev)}
        className={FAB_CLASS}
      >
        <PetAvatar reaction={activeReaction} />
      </button>
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
          <NavigatorPanel gridClassName="pb-4" onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default PixelPet;
