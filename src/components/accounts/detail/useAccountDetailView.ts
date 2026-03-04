import { useCallback, useEffect, useState } from 'react';

import {
  type AccountSnapshot,
  type AccountSnapshotCreate,
  type ChartDataPoint,
} from '@/domains/account/types';
import { useAccountCmds } from '@/hooks/useAccountCmds';
import { assetTrackingService } from '@/services/assetTrackingService';

export const useAccountDetailView = (
  householdId?: string,
  accountId?: string,
  email?: string,
  onSuccess?: () => void,
) => {
  const {
    recordSnapshot,
    updateSnapshot,
    deleteSnapshot: deleteCmd,
  } = useAccountCmds(householdId, email);

  const [editing, setEditing] = useState<AccountSnapshot | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [trend, setTrend] = useState(0);
  const [trendPercentage, setTrendPercentage] = useState('0.0');

  const fetchData = useCallback(async () => {
    if (!householdId || !accountId) return;
    const result = await assetTrackingService.getAccountTrend(householdId, accountId);
    setChartData(result.chartData);
    setTrend(result.trend);
    setTrendPercentage(result.trendPercentage);
  }, [householdId, accountId]);

  useEffect(() => {
    let ignore = false;

    const init = async () => {
      if (!householdId || !accountId) return;
      const result = await assetTrackingService.getAccountTrend(householdId, accountId);
      if (!ignore) {
        setChartData(result.chartData);
        setTrend(result.trend);
        setTrendPercentage(result.trendPercentage);
      }
    };

    init();

    return () => {
      ignore = true;
    };
  }, [householdId, accountId]);

  const save = async (_id: string, snapshot: AccountSnapshotCreate) => {
    if (editing) {
      await updateSnapshot(accountId!, editing.id, snapshot);
    } else {
      await recordSnapshot(accountId!, snapshot);
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
    await deleteCmd(accountId!, snapshotId);
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
