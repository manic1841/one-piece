/**
 * Behaviour authority for Pixel Pet: which moods exist, what may interrupt what,
 * and how often. How a mood is *drawn* lives in `PetAvatar`; when to notify
 * lives at the call sites.
 *
 * The pet is a mascot, not a status indicator: it reacts to what the person is
 * doing, never to financial data. Two moods are continuous (`rest`, `sleep`) and
 * form the base layer; the rest are one-shot events that fall back to the base
 * when they finish.
 */
export type PetBaseMood = 'rest' | 'sleep';
export type PetEventMood = 'move' | 'nod' | 'celebrate' | 'alert';
export type PetMood = PetBaseMood | PetEventMood;

/** Runtime counterpart of `PetMood`, for input the compiler cannot check. */
export const PET_MOODS: readonly PetMood[] = ['rest', 'sleep', 'move', 'nod', 'celebrate', 'alert'];

/** Higher wins; an event of equal or lower rank never interrupts the current one. */
export const MOOD_PRIORITY: Record<PetEventMood, number> = {
  move: 1,
  nod: 2,
  celebrate: 3,
  alert: 4,
};

/** Minimum gap between two notifications of the same mood, in ms. */
export const MOOD_COOLDOWN_MS: Record<PetEventMood, number> = {
  move: 250,
  nod: 1_000,
  celebrate: 0,
  alert: 10_000,
};

/** Time without any interaction before the pet falls asleep. */
export const SLEEP_AFTER_MS = 60_000;
