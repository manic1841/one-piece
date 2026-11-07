import React, { useEffect, useRef, useState } from 'react';

import { DURATION, EASE_OUT_QUINT } from '@/ui/motion';
import { cn } from '@/ui/utils/cn';

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A rendered frame, tagged with the target it belongs to. */
type Frame = { value: number; target: number };

type AnimatedNumberProps = {
  /** Confirmed value. Nullish renders `missing`. */
  value: number | null | undefined;
  /** Formatter applied to every intermediate frame. */
  format: (value: number) => string;
  /** Shown when `value` is nullish. */
  missing?: string;
  /** Override the interpolation length. The data token stays the default. */
  durationMs?: number;
  /**
   * Count up from zero on the first render instead of showing the target. Opt-in:
   * a page entrance must not count up by default (motion-system §5.2), so only a
   * figure that *is* the screen's subject — the dashboard hero — asks for it.
   */
  animateOnMount?: boolean;
  className?: string;
};

/**
 * Interpolates between two confirmed values (motion-system §5.2, M07). By default the
 * first render shows the target immediately — a page entrance must not count up — and
 * only later value changes animate; `animateOnMount` opts a figure into a count-up from
 * zero. Rendering stays a plain text node, so the value is always real content rather
 * than a visual-only effect.
 *
 * Frames carry their own target: a frame left over from an earlier value is
 * simply ignored, so a detour through `null` can never surface a stale middle
 * number as the settled one.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  format,
  missing = '—',
  durationMs = DURATION.data,
  animateOnMount = false,
  className,
}) => {
  const target = value ?? null;
  // rAF is not CSS, so the global reduced-motion rule cannot reach it (§7).
  const [reduced] = useState(prefersReducedMotion);
  // The count-up starts at zero, so the very first paint must already show zero
  // rather than the target flashed for one frame. A zero target needs no seeded
  // frame at all — it already renders zero, and settling must not mute the live region.
  const countsOnMount = animateOnMount && !reduced && target != null;
  const [frame, setFrame] = useState<Frame | null>(
    countsOnMount && target !== 0 ? { value: 0, target: target as number } : null,
  );
  const previous = useRef<number | null>(countsOnMount ? 0 : target);
  // Held until the count-up settles, so a StrictMode remount replays it from zero
  // instead of collapsing into an instant jump.
  const mountFrom = useRef<number | null>(countsOnMount ? 0 : null);

  useEffect(() => {
    const from = mountFrom.current ?? previous.current;
    previous.current = target;

    if (target == null || reduced) {
      mountFrom.current = null;
      return;
    }
    // A value that arrives after the mount (metadata and snapshots load separately)
    // is still a first appearance, so `animateOnMount` counts it up from zero too.
    const start = from ?? (animateOnMount ? 0 : null);

    if (start === target) {
      mountFrom.current = null;
      return;
    }
    if (start == null) {
      mountFrom.current = null;
      return;
    }

    const started = performance.now();
    let handle: number | null = null;
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / durationMs);
      setFrame(
        progress < 1
          ? { value: start + (target - start) * EASE_OUT_QUINT(progress), target }
          : null,
      );
      if (progress < 1) {
        handle = requestAnimationFrame(step);
      } else {
        mountFrom.current = null;
        handle = null;
      }
    };
    handle = requestAnimationFrame(step);

    return () => {
      if (handle !== null) cancelAnimationFrame(handle);
    };
  }, [target, durationMs, reduced, animateOnMount]);

  const live = frame !== null && frame.target === target ? frame.value : null;
  const shown = target == null || reduced ? target : (live ?? target);

  return (
    <span
      className={cn('font-mono tabular-nums', className)}
      aria-live={live === null ? 'polite' : 'off'}
    >
      {shown == null ? missing : format(shown)}
    </span>
  );
};
