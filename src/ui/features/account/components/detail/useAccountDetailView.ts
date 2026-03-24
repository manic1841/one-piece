import { useCallback, useEffect, useState } from 'react';

// import { assetTrackingService } from '@/services/assetTrackingService';
import {
  type AccountSnapshot,
  type AccountSnapshotCreate,
  type ChartDataPoint,
} from '@/domains/account/types';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';

export const useAccountDetailView = (
  householdId?: string,
  accountId?: string,
  onSuccess?: () => void,
) => {
  const {
    recordSnapshot,
    updateSnapshot,
    deleteSnapshot: deleteCmd,
  } = useAccountCmds(householdId || '');

  const [editing, setEditing] = useState<AccountSnapshot | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [trend, setTrend] = useState(0);
  const [trendPercentage, setTrendPercentage] = useState('0.0');

  const fetchData = useCallback(async () => {
    if (!householdId || !accountId) return;
    setChartData([]);
    setTrend(0);
    setTrendPercentage('0.0');
  }, [householdId, accountId]);

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();
  }, [fetchData]);

  const save = async (_id: string, snapshot: AccountSnapshotCreate) => {
    if (!householdId || !accountId) return;
    if (editing) {
      await updateSnapshot(accountId, editing.id, snapshot);
    } else {
      await recordSnapshot(accountId, snapshot);
    }
    await fetchData();
    onSuccess?.();
  };

  const editClick = (snapshot: AccountSnapshot) => {
    setEditing(snapshot);
    setIsFormOpen(true);
  };

  const deleteClick = async (snapshotId: string) => {
    if (!confirm('Are you sure you want to delete this snapshot?')) return;
    if (!householdId || !accountId) return;
    await deleteCmd(accountId, snapshotId);
    await fetchData();
    onSuccess?.();
  };

  const openForm = () => {
    setEditing(undefined);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(undefined);
  };

  return {
    chartData,
    trend,
    trendPercentage,
    save,
    editClick,
    deleteClick,
    isFormOpen,
    openForm,
    closeForm,
    editing,
    refreshChart: fetchData,
  };
};
