import clsx from 'clsx';

/**
 * Hit-area geometry shared by the produced trigger and the gallery probe: the
 * 44px `touch-target` minimum, bottom-aligned so the box's bottom edge sits on
 * the feet (the canvas anchor) instead of centring. The art overhangs above it.
 *
 * The focus ring repeats `buttonVariants` on purpose: the trigger is a bare
 * button with its own circular scale, so it cannot take the shared button box.
 */
export const PET_HIT_AREA_CLASS =
  'flex h-11 w-11 items-end justify-center rounded-full transition-transform duration-fast ease-out-quint hover:scale-105 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Fixed placement of the trigger. Offsets keep the centre where the previous
 * 56px button put it (16px + 28px from each edge).
 */
export const PET_FAB_CLASS = clsx(
  PET_HIT_AREA_CLASS,
  'fixed right-[calc(1rem+0.375rem)] bottom-[calc(6rem+1.75rem)] z-[60] md:right-[calc(2rem+0.375rem)] md:bottom-[calc(2rem+1.75rem)]',
);
