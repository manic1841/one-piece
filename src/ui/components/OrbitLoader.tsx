import * as React from 'react';

import { cn } from '@/ui/utils/cn';

/** Waits this long before drawing, so a fast answer never flashes a spinner. */
const APPEAR_DELAY_MS = 300;

interface OrbitLoaderProps {
  /** Override the appearance delay. `0` shows the ring immediately. */
  appearAfterMs?: number;
  className?: string;
}

/**
 * Pending indicator for a genuinely async task (motion-system §5.4). Decorative
 * only — the caller owns the status text next to it, because only the caller
 * knows what is running. The ring waits before appearing, and under reduced
 * motion it stays put as a still ring so the "still working" signal survives.
 */
export function OrbitLoader({ appearAfterMs = APPEAR_DELAY_MS, className }: OrbitLoaderProps) {
  const [visible, setVisible] = React.useState(appearAfterMs === 0);

  React.useEffect(() => {
    if (appearAfterMs === 0) return;
    const timer = window.setTimeout(() => setVisible(true), appearAfterMs);
    return () => window.clearTimeout(timer);
  }, [appearAfterMs]);

  if (!visible) return null;

  return (
    <span
      aria-hidden
      data-testid="orbit-loader"
      className={cn('relative inline-flex size-3 shrink-0', className)}
    >
      <span className="absolute inset-0 rounded-full border border-current opacity-30" />
      <span className="absolute inset-0 flex items-start justify-center motion-safe:animate-spin">
        <span className="size-1 rounded-full bg-current" />
      </span>
    </span>
  );
}
