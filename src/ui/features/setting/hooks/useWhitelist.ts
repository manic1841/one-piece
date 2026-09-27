import { useCallback, useState } from 'react';

import { addWhitelistEmailUseCase } from '@/application/auth/use_cases/addWhitelistEmailUseCase';
import { getWhitelistUseCase } from '@/application/auth/use_cases/getWhitelistUseCase';
import { removeWhitelistEmailUseCase } from '@/application/auth/use_cases/removeWhitelistEmailUseCase';
import { useAuthState } from '@/ui/contexts/useAuthState';

export function useWhitelist() {
  const { isAdmin } = useAuthState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWhitelist = useCallback(async (): Promise<string[]> => {
    setLoading(true);
    setError(null);
    try {
      const whitelist = await getWhitelistUseCase.execute();
      return whitelist?.emails || [];
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const addEmail = useCallback(
    async (email: string) => {
      setLoading(true);
      setError(null);
      try {
        await addWhitelistEmailUseCase.execute(email, isAdmin);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [isAdmin],
  );

  const removeEmail = useCallback(
    async (email: string) => {
      setLoading(true);
      setError(null);
      try {
        await removeWhitelistEmailUseCase.execute(email, isAdmin);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [isAdmin],
  );

  return { fetchWhitelist, addEmail, removeEmail, loading, error };
}
