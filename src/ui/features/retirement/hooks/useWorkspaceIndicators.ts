import { useCallback, useEffect, useRef, useState } from 'react';

import { type ProjectionSummary } from '@/domains/retirement/projectionTypes';
import {
  EMPTY_INDICATORS,
  type RailIndicators,
  failedIndicators,
  mapIndicators,
} from '@/ui/features/retirement/viewmodels/railIndicators.vm';

const REFRESH_DELAY_MS = 300;

/**
 * Owns the rail indicator state. The slider schedules a refresh 300ms after it
 * stops; any other edit marks the current values OUTDATED until the next
 * refresh or calculate.
 */
export function useWorkspaceIndicators(
  calculate: () => Promise<ProjectionSummary>,
  failureLabel: string,
) {
  const [indicators, setIndicators] = useState<RailIndicators>(EMPTY_INDICATORS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runRef = useRef(0);

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => cancelTimer, [cancelTimer]);

  const markOutdated = useCallback(() => {
    setIndicators((current) =>
      current.status === 'idle' ? current : { ...current, status: 'stale' },
    );
  }, []);

  const refreshNow = useCallback(async () => {
    const run = ++runRef.current;
    try {
      const summary = await calculate();
      if (run === runRef.current) setIndicators(mapIndicators(summary, 'fresh'));
    } catch {
      if (run === runRef.current) setIndicators(failedIndicators(failureLabel));
    }
  }, [calculate, failureLabel]);

  const schedule = useCallback(() => {
    cancelTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void refreshNow();
    }, REFRESH_DELAY_MS);
  }, [cancelTimer, refreshNow]);

  const reset = useCallback(() => {
    cancelTimer();
    runRef.current += 1;
    setIndicators(EMPTY_INDICATORS);
  }, [cancelTimer]);

  return { indicators, markOutdated, schedule, reset };
}
