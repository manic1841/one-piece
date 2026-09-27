import { useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage } from './getErrorMessage';

const ABORTED = { ok: false, kind: 'aborted' } as const;

/**
 * The outcome of a `run`. `run` never rejects *for the task's failure* and never
 * resolves to `undefined`, so callers can always tell a failure from a
 * successful `undefined` by narrowing the result instead of guessing.
 */
export type LoadingTaskResult<T> =
  | { ok: true; value: T }
  | { ok: false; kind: 'failed'; error: unknown }
  | { ok: false; kind: 'aborted' };

/**
 * The outcome handed to `writeBack`. It is `LoadingTaskResult` minus the
 * `aborted` arm: an abandoned run never calls `writeBack`, and the type makes
 * that unrepresentable rather than merely documented.
 */
export type LoadingTaskWriteBackResult<T> = { ok: true; value: T } | { ok: false; error: unknown };

export interface LoadingTaskOptions<T> {
  signal?: AbortSignal;
  /**
   * Called with the run's outcome once it settles, unless the run was abandoned.
   *
   * Writing back through here — instead of after `await run(...)` — keeps the
   * write in the mechanism's hands: an abandoned run cannot land as stale state,
   * and a consumer never calls `setState` in its own continuation. See
   * `docs/ui/ui-layer-architecture.md` §4 (Write-Back Through `writeBack`).
   *
   * Runs after `loading` drops and outside this hook's failure handling, so a
   * throw here propagates instead of being reported as the task's failure.
   */
  writeBack?: (result: LoadingTaskWriteBackResult<T>) => void;
}

export interface UseLoadingTaskOptions {
  /**
   * Start out in the loading state, for a hook whose first render happens
   * *before* any `run` is initiated — a route gate, or a list whose first paint
   * must not show the empty state.
   *
   * The seed is released when a `run` is **initiated**, not when it settles, so
   * the seed and the run's own count overlap and `loading` never flickers. The
   * consequence is a hard requirement: a hook that asks for the seed MUST
   * always initiate a run — including on the paths where it has nothing to
   * fetch, which means those guards belong *inside* the task.
   */
  initiallyLoading?: boolean;
}

export function useLoadingTask(options?: UseLoadingTaskOptions) {
  const [loadingCount, setLoadingCount] = useState(0);
  // Wrapped so that "no error" stays distinguishable from a thrown `null`.
  const [failure, setFailure] = useState<{ value: unknown } | null>(null);
  // See `initiallyLoading`: released on the first `run`, never before.
  const [seeded, setSeeded] = useState(options?.initiallyLoading ?? false);
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

  const loading = loadingCount > 0 || seeded;
  const error = failure === null ? null : failure.value;
  // Both views derive from the same state, so they cannot drift apart.
  const errorMessage = failure === null ? null : getErrorMessage(failure.value);

  const run = useCallback(
    async <T>(
      task: (signal: AbortSignal) => Promise<T>,
      options?: LoadingTaskOptions<T>,
    ): Promise<LoadingTaskResult<T>> => {
      // Before the abort check on purpose: an abandoned run still counts as an
      // initiated one, which is what keeps the seed from being stranded.
      setSeeded(false);

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

      let outcome: LoadingTaskResult<T>;
      try {
        const value = await task(signal ?? new AbortController().signal);
        // A task may ignore its signal; the write-back is discarded either way.
        outcome = signal?.aborted ? ABORTED : { ok: true, value };
      } catch (caught) {
        if (signal?.aborted) {
          outcome = ABORTED;
        } else {
          setFailure({ value: caught });
          outcome = { ok: false, kind: 'failed', error: caught };
        }
      } finally {
        setLoadingCount((n) => n - 1);
      }

      // Outside the try/catch on purpose: an abandoned run never reaches the
      // write-back, and a throw from `writeBack` is the caller's own bug — it is
      // neither the task's failure nor something this hook should swallow.
      // Built explicitly so the runtime shape carries no `kind` the declared
      // `LoadingTaskWriteBackResult` does not promise.
      if (outcome.ok) {
        options?.writeBack?.({ ok: true, value: outcome.value });
      } else if (outcome.kind === 'failed') {
        options?.writeBack?.({ ok: false, error: outcome.error });
      }
      return outcome;
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
