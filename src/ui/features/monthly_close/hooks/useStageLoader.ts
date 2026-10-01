import { useCallback, useEffect, useRef, useState } from 'react';

import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export interface UseStageLoaderArgs<T> {
  /** The period key (the selected `yearMonth`). A change retires the loaded value. */
  key: string;
  /**
   * The single gate. The consumer composes every precondition into it
   * (`householdId`, the period, shared-entity readiness), so "nothing to fetch"
   * never enters the loader as an empty run whose result would be written back.
   */
  enabled: boolean;
  /**
   * The read. Throws the consumer's canned copy on failure — the loader forwards
   * the message, it never invents wording. No guards belong in here.
   */
  load: (signal: AbortSignal) => Promise<T>;
}

export interface UseStageLoaderResult<T> {
  /** The value loaded for the current key, or null when unknown (not yet loaded). */
  data: T | null;
  errorMessage: string | null;
  isLoading: boolean;
  /** A gate reads this: the data is known and the last load did not fail. */
  isReady: boolean;
  /** Explicit reload; it bypasses `enabled` so reopen/reset flows are never gated. */
  refresh: () => Promise<void>;
}

/**
 * The close stages' period-keyed load skeleton, extracted into one mechanism: an
 * in-flight `AbortController` that supersedes the previous run, a value keyed by
 * the period so a month switch never shows the last month's data, "a failed run
 * writes nothing", the `enabled` gate, and the gate-friendly `isReady` reading.
 * A stage hook keeps only its payload mapping; the mecanics live here.
 *
 * Failure semantics are keyed by what is known: a failed same-month reload
 * writes nothing, so the previous value stays on screen and `errorMessage` marks
 * the stage unknown; a failed month switch leaves the new key's value unset
 * (reads as null), so nothing of the previous month leaks forward.
 */
export const useStageLoader = <T>({
  key,
  enabled,
  load,
}: UseStageLoaderArgs<T>): UseStageLoaderResult<T> => {
  const { errorMessage, loading: isLoading, run } = useLoadingTask();
  const [state, setState] = useState<{ key: string; value: T } | null>(null);
  // A slow load for a key the user already left must not land last and win.
  const inFlightRef = useRef<AbortController | null>(null);

  // The load identity is allowed to change every render (consumers build it
  // inline); keeping it in a ref means a new closure never re-triggers a load by
  // itself — only `key`/`enabled` do, through `runLoad`'s identity. The ref is
  // synced in an effect (declared before the run effect, so it is current by the
  // time a load starts) rather than during render.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const runLoad = useCallback(async () => {
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    // The key is captured at start: if it changes while this run is in flight,
    // the new key's load aborts this one; if nothing reloads (a disabled gate),
    // an abandoned run writes nothing anyway.
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
