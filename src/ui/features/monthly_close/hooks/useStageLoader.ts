import { useCallback, useEffect, useRef, useState } from 'react';

import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export interface UseStageLoaderArgs<T> {
  /** The period key (the selected `yearMonth`); a change retires the loaded value. */
  key: string;
  /** The single gate: the consumer composes every precondition into it. */
  enabled: boolean;
  /** The read; it throws the consumer's canned copy on failure. */
  load: (signal: AbortSignal) => Promise<T>;
}

export interface UseStageLoaderResult<T> {
  /** The value loaded for the current key, or null when unknown. */
  data: T | null;
  errorMessage: string | null;
  isLoading: boolean;
  /** A gate reads this: the data is known and the last load did not fail. */
  isReady: boolean;
  /** Explicit reload; it bypasses `enabled` so reopen/reset flows are never gated. */
  refresh: () => Promise<void>;
}

/** The close stages' period-keyed load skeleton: abort/supersede, per-key reset, and `isReady`. */
export const useStageLoader = <T>({
  key,
  enabled,
  load,
}: UseStageLoaderArgs<T>): UseStageLoaderResult<T> => {
  const { errorMessage, loading: isLoading, run } = useLoadingTask();
  const [state, setState] = useState<{ key: string; value: T } | null>(null);
  // A slow load for a key the user already left must not land last and win.
  const inFlightRef = useRef<AbortController | null>(null);

  // `load` is kept in a ref so only `key` and `enabled` re-trigger a load.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const runLoad = useCallback(async () => {
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    // The key is captured at start, so an abandoned run writes nothing.
    await run((signal) => loadRef.current(signal), {
      signal: controller.signal,
      writeBack: (result) => {
        if (!result.ok) return;
        setState({ key, value: result.value });
      },
    });
  }, [key, run]);

  useEffect(() => {
    if (!enabled) {
      // Abandon anything in flight so a stale value cannot land under the gate.
      inFlightRef.current?.abort();
      return;
    }
    void runLoad();
  }, [enabled, runLoad]);

  const data = state?.key === key ? state.value : null;

  return {
    data,
    errorMessage,
    isLoading,
    isReady: data !== null && errorMessage === null,
    refresh: runLoad,
  };
};
