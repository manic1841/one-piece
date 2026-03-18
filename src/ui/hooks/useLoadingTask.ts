import { useCallback, useState } from 'react';

export function useLoadingTask() {
  const [loadingCount, setLoadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loading = loadingCount > 0;

  const run = useCallback(async <T>(task: () => Promise<T>): Promise<T | undefined> => {
    setLoadingCount((n) => n + 1);
    setError(null);

    try {
      return await task();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return undefined;
    } finally {
      setLoadingCount((n) => n - 1);
    }
  }, []);

  return {
    loading,
    error,
    run,
  };
}
