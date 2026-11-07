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
  className?: string;
};

/**
 * Interpolates between two confirmed values (motion-system §5.2, M07). The first
 * render shows the target immediately — a page entrance must not count up — and
 * only later value changes animate. Rendering stays a plain text node, so the
 * value is always real content rather than a visual-only effect.
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
  className,
}) => {
  const target = value ?? null;
  const [frame, setFrame] = useState<Frame | null>(null);
  // rAF is not CSS, so the global reduced-motion rule cannot reach it (§7).
  const [reduced] = useState(prefersReducedMotion);
  const previous = useRef(target);

  useEffect(() => {
    const from = previous.current;
    previous.current = target;

    if (from === target) return;
    if (target == null || from == null || reduced) return;

    const started = performance.now();
    let handle: number | null = null;
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / durationMs);
      setFrame(
        progress < 1 ? { value: from + (target - from) * EASE_OUT_QUINT(progress), target } : null,
      );
      handle = progress < 1 ? requestAnimationFrame(step) : null;
    };
    handle = requestAnimationFrame(step);

    return () => {
      if (handle !== null) cancelAnimationFrame(handle);
    };
  }, [target, durationMs, reduced]);

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
