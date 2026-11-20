import { toast } from 'sonner';

import { LIVE_TOAST_OPTIONS, Toast } from '@/ui/components/Toast';
import type { PetEventMood } from '@/ui/hooks/petMood';

type PetMoodListener = (mood: PetEventMood) => void;

/**
 * Module-level seam rather than a context: a toast runs outside React, and a
 * page must not have to know whether a pet is mounted. One pet exists, so the
 * last mounted `usePetMood` wins and any earlier subscription is replaced.
 */
let listener: PetMoodListener | null = null;

/** Registered by `usePetMood`; returns the unsubscribe. */
export const setPetMoodListener = (next: PetMoodListener): (() => void) => {
  listener = next;
  return () => {
    if (listener === next) listener = null;
  };
};

const petMood = (mood: PetEventMood): void => listener?.(mood);

/** Mood only, for outcomes that already render their own feedback. */
export const celebrate = (): void => petMood('celebrate');
export const alert = (): void => petMood('alert');

/**
 * The way a call site reports an outcome with a toast: the toast and the pet
 * reaction are one decision, so the two cannot drift apart. The pet half is a
 * no-op when nothing is mounted.
 */
export const notifySaved = (message: string): void => {
  celebrate();
  toast.custom(() => <Toast message={message} />, LIVE_TOAST_OPTIONS);
};

export const notifyFailed = (message: string): void => {
  alert();
  toast.custom(() => <Toast message={message} tone="error" />, LIVE_TOAST_OPTIONS);
};
