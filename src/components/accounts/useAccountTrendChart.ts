import { useEffect, useState } from 'react';

import { type AssetDataPoint } from '@/domains/account/types/account';
import { assetTrackingService } from '@/services/assetTrackingService';

export const useAccountTrendChart = (householdId?: string) => {
  const [data, setData] = useState<AssetDataPoint[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(12); // in months

  useEffect(() => {
    const fetchData = async () => {
      if (!householdId) return;
      const trendData = await assetTrackingService.getAssetTrend(householdId, selectedPeriod);
      setData(trendData);
    };

    fetchData();
  }, [householdId, selectedPeriod]);

  const selectPeriod = (period: number) => {
    setSelectedPeriod(period);
  };

  return { data, selectedPeriod, selectPeriod };
};
