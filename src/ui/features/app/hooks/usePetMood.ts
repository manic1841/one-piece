import { useCallback, useEffect, useRef, useState } from 'react';

import { setPetMoodListener } from '@/ui/hooks/notify';
import {
  MOOD_COOLDOWN_MS,
  MOOD_PRIORITY,
  type PetBaseMood,
  type PetEventMood,
  type PetMood,
  SLEEP_AFTER_MS,
} from '@/ui/hooks/petMood';

type ActiveMood = {
  mood: PetEventMood;
  /** Changes on every accepted notification, so a repeat replays the animation. */
  seq: number;
};

type PetMoodController = {
  mood: PetMood;
  /** Sequence of the current event; `0` while no event is playing. */
  seq: number;
  /** Ask for an event. Ignored while cooled down or outranked by the current one. */
  notify: (mood: PetEventMood) => void;
  /** Report that the current event finished, so the pet returns to the base. */
  endEvent: () => void;
};

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'wheel'] as const;

/**
 * Pixel Pet mood machine: a continuous base (`rest`, falling asleep when the
 * page is left alone) overlaid by one-shot events.
 *
 * Events do not queue — an interrupting event replaces the current one and the
 * replaced animation is simply dropped. `PetAvatar` reports the end of a
 * one-shot animation and the mood falls back to the base.
 */
export function usePetMood(): PetMoodController {
  const [base, setBase] = useState<PetBaseMood>('rest');
  const [event, setEvent] = useState<ActiveMood | null>(null);
  const current = useRef<ActiveMood | null>(null);
  const seqCounter = useRef(0);
  const lastAt = useRef<Partial<Record<PetEventMood, number>>>({});

  const notify = useCallback((mood: PetEventMood) => {
    const now = Date.now();
    if ((lastAt.current[mood] ?? -Infinity) + MOOD_COOLDOWN_MS[mood] > now) return;
    // Priority is decided outside the updater so the cooldown stamp is written
    // once, not once per StrictMode invocation of the updater.
    if (current.current !== null && MOOD_PRIORITY[mood] <= MOOD_PRIORITY[current.current.mood]) {
      return;
    }

    lastAt.current[mood] = now;
    seqCounter.current += 1;
    const next = { mood, seq: seqCounter.current };
    current.current = next;
    setEvent(next);
  }, []);

  const endEvent = useCallback(() => {
    current.current = null;
    setEvent(null);
  }, []);

  // Toast/notify call sites reach the pet through the module seam.
  useEffect(() => setPetMoodListener(notify), [notify]);

  // Sleep is inactivity-driven. Any input wakes the pet; a hidden tab pauses
  // the countdown instead of piling it up.
  useEffect(() => {
    let timer: number | undefined;
    const startCountdown = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => setBase('sleep'), SLEEP_AFTER_MS);
    };
    const onActivity = () => {
      if (base === 'sleep') setBase('rest');
      else startCountdown();
    };
    const onVisibility = () => {
      if (document.hidden) window.clearTimeout(timer);
      else onActivity();
    };

    startCountdown();
    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, onActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearTimeout(timer);
      for (const name of ACTIVITY_EVENTS) {
        window.removeEventListener(name, onActivity);
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [base]);

  return {
    mood: event?.mood ?? base,
    seq: event?.seq ?? 0,
    notify,
    endEvent,
  };
}
