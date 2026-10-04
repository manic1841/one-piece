import { useCallback, useEffect, useRef, useState } from 'react';

import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export interface UseStageLoaderArgs<T> {
  /** The single gate: the consumer composes every precondition into it. */
  enabled: boolean;
  /** The read; it throws the consumer's canned copy on failure. */
  load: (signal: AbortSignal) => Promise<T>;
}

export interface UseStageLoaderResult<T> {
  /** The loaded value, or null when unknown. */
  data: T | null;
  errorMessage: string | null;
  isLoading: boolean;
  /** A gate reads this: the data is known and the last load did not fail. */
  isLoaded: boolean;
  /** Explicit reload; it bypasses `enabled` so reopen/reset flows are never gated. */
  refresh: () => Promise<void>;
}

/** The close stages' load skeleton: abort/supersede, failure-is-not-empty, and `isLoaded`. */
export const useStageLoader = <T>({
  enabled,
  load,
}: UseStageLoaderArgs<T>): UseStageLoaderResult<T> => {
  const { errorMessage, loading: isLoading, run } = useLoadingTask();
  const [data, setData] = useState<T | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);

  // `load` is kept in a ref so only `enabled` re-triggers a load.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const runLoad = useCallback(async () => {
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    await run((signal) => loadRef.current(signal), {
      signal: controller.signal,
      writeBack: (result) => {
        if (!result.ok) return;
        setData(result.value);
      },
    });
  }, [run]);

  useEffect(() => {
    if (!enabled) {
      // Abandon anything in flight so a stale value cannot land under the gate.
      inFlightRef.current?.abort();
      return;
    }
    void runLoad();
  }, [enabled, runLoad]);

  return {
    data,
    errorMessage,
    isLoading,
    isLoaded: data !== null && errorMessage === null,
    refresh: runLoad,
  };
};
