import { useCallback, useEffect, useState } from 'react';

import { addWatchListTargetUseCase } from '@/application/watch_list/use_cases/addWatchListTargetUseCase';
import { listWatchListUseCase } from '@/application/watch_list/use_cases/listWatchListUseCase';
import { removeWatchListTargetUseCase } from '@/application/watch_list/use_cases/removeWatchListTargetUseCase';
import { type WatchListTarget, type WatchListTargetType } from '@/domains/watch_list/schemas';
import { useAuth } from '@/infra/contexts/useAuth';
import { useAuthContext } from '@/ui/hooks/useAuthContext';

export function useWatchListSettings() {
  const { userProfile } = useAuth();
  const auth = useAuthContext();
  const householdId = userProfile?.householdId;

  const [targets, setTargets] = useState<WatchListTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchTargets = useCallback(async () => {
    if (!householdId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await listWatchListUseCase.execute({ householdId, auth });
      setTargets(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [auth, householdId]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const addTarget = useCallback(
    async (targetType: WatchListTargetType, targetId: string, name: string) => {
      if (!householdId) return;
      setSaving(true);
      setError('');
      try {
        await addWatchListTargetUseCase.execute({
          householdId,
          auth,
          userEmail: auth.email ?? '',
          target: { targetType, targetId, name },
        });
        await fetchTargets();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSaving(false);
      }
    },
    [auth, fetchTargets, householdId],
  );

  const removeTarget = useCallback(
    async (targetType: WatchListTargetType, targetId: string) => {
      if (!householdId) return;
      setSaving(true);
      setError('');
      try {
        await removeWatchListTargetUseCase.execute({
          householdId,
          auth,
          targetType,
          targetId,
        });
        await fetchTargets();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSaving(false);
      }
    },
    [auth, fetchTargets, householdId],
  );

  return {
    targets,
    loading,
    saving,
    error,
    addTarget,
    removeTarget,
    refresh: fetchTargets,
  };
}
