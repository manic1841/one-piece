import { useCallback, useEffect, useMemo, useState } from 'react';

import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';
import { useAuth } from '@/infra/contexts/useAuth';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function usePortfolios(householdId: string) {
  const { currentUser, isAdmin } = useAuth();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [latestSnapshots, setLatestSnapshots] = useState<Map<string, PortfolioSnapshot>>(new Map());
  const { loading, error, run } = useLoadingTask();

  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser?.uid, isAdmin],
  );

  const load = useCallback(async () => {
    if (!householdId) return;
    return run(async () => {
      const data = await listPortfoliosUseCase.execute({ householdId, auth });
      setPortfolios(data);

      const snapshotsMap = new Map<string, PortfolioSnapshot>();
      for (const portfolio of data) {
        const snapshots = await listPortfolioSnapshotsUseCase.execute({
          householdId,
          portfolioId: portfolio.id,
          auth,
        });
        if (snapshots.length > 0) {
          snapshotsMap.set(portfolio.id, snapshots[0]);
        }
      }
      setLatestSnapshots(snapshotsMap);
    });
  }, [householdId, auth, run]);

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
}

export function usePortfolioQueries(householdId: string) {
  const { currentUser, isAdmin } = useAuth();
  const { loading, error, run } = useLoadingTask();
  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser?.uid, isAdmin],
  );

  const getSnapshots = useCallback(
    async (portfolioId: string, year?: number, month?: number) => {
      return run(async () => {
        return listPortfolioSnapshotsUseCase.execute({
          householdId,
          portfolioId,
          year,
          month,
          auth,
        });
      });
    },
    [householdId, auth, run],
  );

  return {
    loading,
    error,
    getSnapshots,
  };
}
