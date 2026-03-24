import { useState, useCallback } from 'react';
import { getUserProfileUseCase } from '@/application/user/use_cases/getUserProfileUseCase';
import { type UserProfile } from '@/domains/user/types';

export function useGetUserProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (uid: string): Promise<UserProfile | null> => {
    setLoading(true);
    setError(null);
    try {
      return await getUserProfileUseCase.execute({ uid });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}
