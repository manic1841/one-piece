import { useCallback, useState } from 'react';

export function useLoadingTask() {
  const [loadingCount, setLoadingCount] = useState(0);
  const [error, setError] = useState<unknown>(null);

  const isLoading = loadingCount > 0;

  const run = useCallback(async <T>(task: () => Promise<T>): Promise<T | undefined> => {
    setLoadingCount((n) => n + 1);
    setError(null);

    try {
      return await task();
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setLoadingCount((n) => n - 1);
    }
  }, []);

  return {
    isLoading,
    error,
    run,
  };
}
