import { useCallback, useEffect, useState } from 'react';

import { useLoadingTask } from '@/hooks/useLoadingTask';
import { type Portfolio, type PortfolioSnapshot } from '@/schemas';
import { portfolioService } from '@/services/portfolioService';

export const usePortfolios = (householdId?: string) => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [latestSnapshots, setLatestSnapshots] = useState<Map<string, PortfolioSnapshot>>(new Map());
  const { loading, error, run } = useLoadingTask();

  const load = useCallback(async () => {
    run(async () => {
      if (!householdId) return;
      const data = await portfolioService.getPortfolios(householdId);
      setPortfolios(data);

      // Load latest snapshot for each portfolio
      const snapshotsMap = new Map<string, PortfolioSnapshot>();
      for (const portfolio of data) {
        const snapshots = await portfolioService.getSnapshots(householdId, portfolio.id);
        if (snapshots.length > 0) {
          snapshotsMap.set(portfolio.id, snapshots[0]);
        }
      }
      setLatestSnapshots(snapshotsMap);
    });
  }, [run, householdId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    portfolios,
    latestSnapshots,
    loading,
    error,
    reload: load,
  };
};
