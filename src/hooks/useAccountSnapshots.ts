import { useState, useEffect, useCallback } from 'react';
import { type AccountSnapshot } from '../schemas';
import { accountService } from '../services/accountService';

export function useAccountSnapshots(householdId: string, accountId: string) {
  const [snapshots, setSnapshots] = useState<AccountSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSnapshots = useCallback(async () => {
    try {
      setLoading(true);
      const snapshotsList = await accountService.getSnapshots(householdId, accountId);
      setSnapshots(snapshotsList);
    } catch (error) {
      console.error('Error loading snapshots:', error);
    } finally {
      setLoading(false);
    }
  }, [householdId, accountId]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const updateSnapshot = async (snapshotId: string, updates: { amount: number; year: number; month: number }) => {
    try {
      await accountService.updateSnapshot(householdId, accountId, snapshotId, updates);
      await loadSnapshots();
      return true;
    } catch (error) {
      console.error('Error updating snapshot:', error);
      return false;
    }
  };

  const deleteSnapshot = async (snapshotId: string) => {
    try {
      await accountService.deleteSnapshot(householdId, accountId, snapshotId);
      await loadSnapshots();
      return true;
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      return false;
    }
  };

  return {
    snapshots,
    loading,
    updateSnapshot,
    deleteSnapshot,
    refresh: loadSnapshots,
  };
}
