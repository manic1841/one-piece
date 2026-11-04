import { useCallback, useEffect, useRef } from 'react';

import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

/**
 * Feature mechanism for a read that loads once and can be retried. It owns the
 * effect, the run and the write-back; callers only supply the task, the
 * destination and the dependencies that should trigger a reload.
 */
export function useLoadOnce<T>(
  task: (signal: AbortSignal) => Promise<T>,
  onValue: (value: T) => void,
  deps: unknown[],
  options?: { initiallyLoading?: boolean },
) {
  const { loading, error, errorMessage, run } = useLoadingTask({
    initiallyLoading: options?.initiallyLoading,
  });

  const taskRef = useRef(task);
  taskRef.current = task;
  const onValueRef = useRef(onValue);
  onValueRef.current = onValue;
  const controllerRef = useRef<AbortController | null>(null);

  /**
   * Latest request wins: a new load (dependency change or an explicit retry)
   * aborts the one in flight, so its late write-back cannot overwrite the
   * current value. `useLoadingTask` only abandons runs on unmount by itself.
   */
  const reload = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    await run((signal) => taskRef.current(signal), {
      signal: controller.signal,
      writeBack: (result) => {
        if (result.ok) onValueRef.current(result.value);
      },
    });
    // The dependencies are intentionally supplied by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ...deps]);

  useEffect(() => {
    void reload();
    return () => controllerRef.current?.abort();
  }, [reload]);

  return { loading, error, errorMessage, reload };
}
