import { useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage } from './getErrorMessage';

const ABORTED = { ok: false, kind: 'aborted' } as const;

/**
 * The outcome of a `run`. `run` never rejects and never resolves to
 * `undefined`, so callers can always tell a failure from a successful
 * `undefined` by narrowing the result instead of guessing.
 */
export type LoadingTaskResult<T> =
  | { ok: true; value: T }
  | { ok: false; kind: 'failed'; error: unknown }
  | { ok: false; kind: 'aborted' };

export interface LoadingTaskOptions {
  signal?: AbortSignal;
}

export function useLoadingTask() {
  const [loadingCount, setLoadingCount] = useState(0);
  // Wrapped so that "no error" stays distinguishable from a thrown `null`.
  const [failure, setFailure] = useState<{ value: unknown } | null>(null);
  const unmountControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // A fresh controller per effect setup: StrictMode's mount → cleanup → mount
    // would otherwise leave the hook permanently aborted.
    const controller = new AbortController();
    unmountControllerRef.current = controller;

    return () => {
      controller.abort();
      unmountControllerRef.current = null;
    };
  }, []);

  const loading = loadingCount > 0;
  const error = failure === null ? null : failure.value;
  // Both views derive from the same state, so they cannot drift apart.
  const errorMessage = failure === null ? null : getErrorMessage(failure.value);

  const run = useCallback(
    async <T>(
      task: (signal: AbortSignal) => Promise<T>,
      options?: LoadingTaskOptions,
    ): Promise<LoadingTaskResult<T>> => {
      const unmountSignal = unmountControllerRef.current?.signal;
      const signal = unmountSignal
        ? // Whichever aborts first: the caller's signal or the unmount of this hook.
          AbortSignal.any(options?.signal ? [options.signal, unmountSignal] : [unmountSignal])
        : options?.signal;

      // Already abandoned: do no work and touch no state.
      if (signal?.aborted) {
        return ABORTED;
      }

      setLoadingCount((n) => n + 1);
      setFailure(null);

      try {
        const value = await task(signal ?? new AbortController().signal);
        // A task may ignore its signal; the write-back is discarded either way.
        if (signal?.aborted) {
          return ABORTED;
        }
        return { ok: true, value };
      } catch (caught) {
        if (signal?.aborted) {
          return ABORTED;
        }
        setFailure({ value: caught });
        return { ok: false, kind: 'failed', error: caught };
      } finally {
        setLoadingCount((n) => n - 1);
      }
    },
    [],
  );

  return {
    loading,
    error,
    errorMessage,
    run,
  };
}
