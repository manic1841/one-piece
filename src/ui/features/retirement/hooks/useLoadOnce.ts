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

  const reload = useCallback(async () => {
    await run((signal) => taskRef.current(signal), {
      writeBack: (result) => {
        if (result.ok) onValueRef.current(result.value);
      },
    });
    // The dependencies are intentionally supplied by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ...deps]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, error, errorMessage, reload };
}
