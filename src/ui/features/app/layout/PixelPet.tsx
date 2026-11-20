import React, { useState } from 'react';

import { NavLink } from 'react-router-dom';

import { Popover, PopoverContent, PopoverTrigger } from '@/ui/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/ui/components/ui/sheet';
import { PET_NAVIGATOR_LABEL, PET_TRIGGER_LABEL } from '@/ui/constants/app/petLabels';
import { type PetMood } from '@/ui/features/app/types/petMood';

import PetTrigger from './PetTrigger';
import { NAVIGATOR_ITEMS } from './navigation';
import { useIsDesktop } from './useIsDesktop';

type PixelPetProps = {
  mood?: PetMood;
  seq?: number;
  onEnd?: () => void;
  /** The pet was pressed, before the navigator opens. */
  onActivate?: () => void;
};

const NAVIGATOR_LINK_CLASS =
  'flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-muted-foreground transition-[color,background-color,transform] duration-fast ease-out-quint hover:bg-accent hover:text-foreground active:scale-[0.97]';

const navigatorLinkClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${NAVIGATOR_LINK_CLASS} text-primary bg-primary/10` : NAVIGATOR_LINK_CLASS;

/** Shared no-op so the desktop trigger keeps one identity across renders. */
const noop = (): void => {};

const NavigatorPanel: React.FC<{ gridClassName?: string; onNavigate: () => void }> = ({
  gridClassName,
  onNavigate,
}) => (
  <>
    <p className="text-xs font-medium text-muted-foreground tracking-heading mb-3">
      {PET_NAVIGATOR_LABEL.toUpperCase()}
    </p>
    <div data-navigator-grid className={`grid grid-cols-2 gap-2 ${gridClassName ?? ''}`}>
      {NAVIGATOR_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} onClick={onNavigate} className={navigatorLinkClassName}>
          <Icon size={18} />
          <span className="text-xs font-medium text-center leading-tight">{label}</span>
        </NavLink>
      ))}
    </div>
  </>
);

const PixelPet: React.FC<PixelPetProps> = ({ mood = 'rest', seq = 0, onEnd, onActivate }) => {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <PetTrigger
            mood={mood}
            seq={seq}
            onEnd={onEnd}
            expanded={open}
            onClick={onActivate ?? noop}
          />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={16}
          data-testid="navigator"
          aria-label={PET_NAVIGATOR_LABEL}
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
      <PetTrigger
        mood={mood}
        seq={seq}
        onEnd={onEnd}
        expanded={open}
        onClick={() => {
          onActivate?.();
          setOpen((prev) => !prev);
        }}
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          data-testid="navigator-sheet"
          aria-label={PET_NAVIGATOR_LABEL}
          className="md:hidden"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => {
            const target = event.detail.originalEvent.target;
            if (
              target instanceof Element &&
              target.closest(`[aria-label="${PET_TRIGGER_LABEL}"]`)
            ) {
              event.preventDefault();
            }
          }}
        >
          <SheetHeader>
            <SheetTitle>{PET_NAVIGATOR_LABEL}</SheetTitle>
          </SheetHeader>
          <NavigatorPanel gridClassName="pb-4" onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default PixelPet;
