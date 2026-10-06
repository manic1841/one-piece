import { useCallback, useEffect, useState } from 'react';

import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { type LoadingTaskResult, useLoadingTask } from '@/ui/hooks/useLoadingTask';

export interface PortfolioListData {
  portfolios: Portfolio[];
  snapshots: Map<string, PortfolioSnapshot>;
}

export function usePortfolios(householdId: string) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [latestSnapshots, setLatestSnapshots] = useState<Map<string, PortfolioSnapshot>>(new Map());
  // `initiallyLoading` so a list's first paint gates on the fetch instead of
  // flashing the empty state (ui-layer-architecture §4, route/boot gates).
  const { loading, error, errorMessage, run } = useLoadingTask({ initiallyLoading: true });

  const auth = useAuthIdentity();

  const load = useCallback(
    async (): Promise<LoadingTaskResult<PortfolioListData>> =>
      run(
        async () => {
          // The "nothing to fetch" guard belongs inside the task: the seed is
          // only released by initiating a run.
          if (!householdId) return { portfolios: [], snapshots: new Map() };

          const data = await listPortfoliosUseCase.execute({ householdId, auth });
          const snapshots = new Map<string, PortfolioSnapshot>();
          for (const portfolio of data) {
            const list = await listPortfolioSnapshotsUseCase.execute({
              householdId,
              portfolioId: portfolio.id,
              auth,
            });
            if (list.length > 0) {
              snapshots.set(portfolio.id, list[0]);
            }
          }
          return { portfolios: data, snapshots };
        },
        {
          // State derived from the run is written by the run, not after `await`
          // (§4 Write-Back Through `writeBack`).
          writeBack: (result) => {
            if (!result.ok) return;
            setPortfolios(result.value.portfolios);
            setLatestSnapshots(result.value.snapshots);
          },
        },
      ),
    [householdId, auth, run],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return {
    portfolios,
    latestSnapshots,
    loading,
    error,
    errorMessage,
    reload: load,
  };
}

export interface PortfolioSnapshotQueryOptions {
  year?: number;
  month?: number;
  /** Receive the fetched list through the task mechanism instead of after `await` (§4). */
  writeBack?: (snapshots: PortfolioSnapshot[]) => void;
}

export function usePortfolioQueries(householdId: string) {
  const { loading, error, errorMessage, run } = useLoadingTask({ initiallyLoading: true });
  const auth = useAuthIdentity();

  const getSnapshots = useCallback(
    async (
      portfolioId: string,
      options?: PortfolioSnapshotQueryOptions,
    ): Promise<LoadingTaskResult<PortfolioSnapshot[]>> =>
      run(
        () =>
          listPortfolioSnapshotsUseCase.execute({
            householdId,
            portfolioId,
            year: options?.year,
            month: options?.month,
            auth,
          }),
        {
          writeBack: (result) => {
            if (result.ok) options?.writeBack?.(result.value);
          },
        },
      ),
    [householdId, auth, run],
  );

  return {
    loading,
    error,
    errorMessage,
    getSnapshots,
  };
}
