import { useEffect, useState } from 'react';

import { type AccountSnapshot, type ChartDataPoint } from '@/domains/account/types';
import { useAccountCmds } from '@/hooks/useAccountCmds';
import { assetTrackingService } from '@/services/assetTrackingService';

export const useAccountDetailView = (householdId?: string, accountId?: string, email?: string) => {
  const { updateSnapshot, deleteSnapshot } = useAccountCmds(householdId, email);

  const [editing, setEditing] = useState<AccountSnapshot | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [trend, setTrend] = useState(0);
  const [trendPercentage, setTrendPercentage] = useState('0.0');

  useEffect(() => {
    const fetchData = async () => {
      if (!householdId || !accountId) return;
      const result = await assetTrackingService.getAccountTrend(householdId, accountId);
      setChartData(result.chartData);
      setTrend(result.trend);
      setTrendPercentage(result.trendPercentage);
    };
    fetchData();
  }, [householdId, accountId]);

  const save = async (id: string, updates: { amount: number; year: number; month: number }) => {
    await updateSnapshot(accountId!, id, updates);
  };

  const editClick = (snapshot: AccountSnapshot) => {
    setEditing(snapshot);
    setIsFormOpen(true);
  };

  const deleteClick = async (snapshotId: string) => {
    if (!confirm('Are you sure you want to delete this snapshot?')) return;
    await deleteSnapshot(accountId!, snapshotId);
  };

  const openForm = () => {
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
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
  };
};
