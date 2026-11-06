import React, { useEffect, useRef, useState } from 'react';

import { cn } from '@/ui/utils/cn';

/** Matches `duration-data` (motion-system §2). Values live in the token file; rAF needs a number. */
const DATA_DURATION_MS = 400;

/** `ease-out-quint` in numeric form — rAF cannot read a CSS curve mid-flight. */
const easeOutQuint = (t: number): number => 1 - (1 - t) ** 5;

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  format,
  missing = '—',
  durationMs = DATA_DURATION_MS,
  className,
}) => {
  const target = value ?? null;
  /** Frame value while a transition runs; null means "render the target". */
  const [frameValue, setFrameValue] = useState<number | null>(null);
  const previous = useRef(target);

  useEffect(() => {
    const from = previous.current;
    previous.current = target;

    if (from === target) return;
    if (target == null || from == null || prefersReducedMotion()) return;

    const started = performance.now();
    let frame: number | null = null;
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / durationMs);
      setFrameValue(progress < 1 ? from + (target - from) * easeOutQuint(progress) : null);
      frame = progress < 1 ? requestAnimationFrame(step) : null;
    };
    frame = requestAnimationFrame(step);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [target, durationMs]);

  // The frame value only matters mid-transition: a nullish target and reduced
  // motion both read straight through to the authoritative value.
  const shown = target == null || prefersReducedMotion() ? target : (frameValue ?? target);

  return (
    <span className={cn('tabular-nums', className)} aria-live="off">
      {shown == null ? missing : format(shown)}
    </span>
  );
};
