import { useCallback, useEffect, useState } from 'react';

import { useLoadingTask } from '@/hooks/useLoadingTask';
import { type Portfolio, type PortfolioSnapshot } from '@/schemas';
import { portfolioService } from '@/services/portfolioService';

export const usePortfolio = (householdId: string, portfolioId?: string) => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const { loading, error, run } = useLoadingTask();

  const load = useCallback(async () => {
    run(async () => {
      if (!householdId || !portfolioId) return;

      const p = await portfolioService.getPortfolio(householdId, portfolioId);
      setPortfolio(p);

      const s = await portfolioService.getSnapshots(householdId, portfolioId);
      setSnapshots(s);
    });
  }, [householdId, portfolioId, run]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    portfolio,
    snapshots,
    loading,
    error,
    reload: load,
  };
};
