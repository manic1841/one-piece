import { useCallback, useState } from 'react';

import { addWhitelistEmailUseCase } from '@/application/access_control/use_cases/addWhitelistEmailUseCase';
import { getWhitelistUseCase } from '@/application/access_control/use_cases/getWhitelistUseCase';
import { removeWhitelistEmailUseCase } from '@/application/access_control/use_cases/removeWhitelistEmailUseCase';
import { useAuth } from '@/infra/contexts/useAuth';

export function useWhitelist() {
  const { isAdmin, currentUser } = useAuth();
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
        await addWhitelistEmailUseCase.execute(email, isAdmin, currentUser?.email || '');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, currentUser],
  );

  const removeEmail = useCallback(
    async (email: string) => {
      setLoading(true);
      setError(null);
      try {
        await removeWhitelistEmailUseCase.execute(email, isAdmin, currentUser?.email || '');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, currentUser],
  );

  return { fetchWhitelist, addEmail, removeEmail, loading, error };
}
