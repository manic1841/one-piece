import { useEffect, useState } from 'react';

import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { type AuthContext } from '@/application/types';
import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/schemas';

interface UsePortfolioSnapshotPrefillArgs {
  householdId: string;
  selectedYearMonth: string;
  portfolios: Portfolio[];
  auth: AuthContext;
}

/**
 * Loads each portfolio's snapshot for the selected close month so the close
 * UI can show month balances, net cash flow, gain, and return rate. Missing
 * entries stay null and render as placeholders.
 */
export const usePortfolioSnapshotPrefill = ({
  householdId,
  selectedYearMonth,
  portfolios,
  auth,
}: UsePortfolioSnapshotPrefillArgs) => {
  const [portfolioSnapshots, setPortfolioSnapshots] = useState<
    Map<string, PortfolioSnapshot | null>
  >(new Map());

  useEffect(() => {
    if (!householdId || !selectedYearMonth || portfolios.length === 0) return;
    let cancelled = false;

    const loadPortfolioSnapshots = async () => {
      const year = Number(selectedYearMonth.slice(0, 4));
      const month = Number(selectedYearMonth.slice(5, 7));
      const entries = await Promise.all(
        portfolios.map(async (portfolio) => {
          const snapshots = await listPortfolioSnapshotsUseCase.execute({
            householdId,
            portfolioId: portfolio.id,
            year,
            month,
            auth,
          });
          return [portfolio.id, snapshots[0] ?? null] as const;
        }),
      );
      if (!cancelled) setPortfolioSnapshots(new Map(entries));
    };

    void loadPortfolioSnapshots();
    return () => {
      cancelled = true;
    };
  }, [auth, householdId, portfolios, selectedYearMonth]);

  return portfolioSnapshots;
};
