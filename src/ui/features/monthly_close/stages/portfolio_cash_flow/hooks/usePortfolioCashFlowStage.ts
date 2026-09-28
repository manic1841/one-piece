import { useEffect, useRef, useState } from 'react';

import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { type AuthContext } from '@/application/types';
import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/schemas';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';

type PortfolioCashFlows = Record<string, { deposits: number; withdrawals: number }>;

interface UsePortfolioCashFlowStageArgs {
  householdId: string;
  selectedYearMonth: string;
  portfolios: Portfolio[];
  auth: AuthContext;
  confirmingStageId: string | null;
  /** Bumped after a relevant confirm so the snapshot display re-fetches (staleness fix). */
  refreshKey?: number;
}

/**
 * Stage controller for PORTFOLIO_CASH_FLOW: owns the cash-flow draft the
 * sections edit and the month-scoped snapshot display data (absorbed from
 * usePortfolioSnapshotPrefill). The draft seeds from the month's booked flows
 * once snapshots have loaded, so a re-confirmation submits the booked flows
 * instead of zero-filling them; user edits after the seed are never
 * overwritten. Bumping `refreshKey` re-fetches the snapshot display after a
 * confirm so the panel reflects the confirm's writes.
 */
export const usePortfolioCashFlowStage = ({
  householdId,
  selectedYearMonth,
  portfolios,
  auth,
  confirmingStageId,
  refreshKey = 0,
}: UsePortfolioCashFlowStageArgs): CloseStageControl & {
  cashFlows: PortfolioCashFlows;
  setCashFlows: React.Dispatch<React.SetStateAction<PortfolioCashFlows>>;
  portfolioSnapshots: Map<string, PortfolioSnapshot | null>;
} => {
  const [cashFlows, setCashFlows] = useState<PortfolioCashFlows>({});
  const [portfolioSnapshots, setPortfolioSnapshots] = useState<
    Map<string, PortfolioSnapshot | null>
  >(new Map());
  const seededMonthRef = useRef<string | null>(null);

  useEffect(() => {
    if (!householdId || !selectedYearMonth || portfolios.length === 0) return;
    let cancelled = false;

    const loadPortfolioSnapshots = async () => {
      setPortfolioSnapshots(new Map());
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
      if (cancelled) return;
      setPortfolioSnapshots(new Map(entries));
      // Seed the draft from the month's booked flows once all snapshots are
      // present; seeds once per month and never overwrites user edits.
      if (seededMonthRef.current === selectedYearMonth) return;
      const seeded: PortfolioCashFlows = {};
      for (const [portfolioId, snapshot] of entries) {
        if (!snapshot) return;
        seeded[portfolioId] = {
          deposits: snapshot.cashFlow.deposits,
          withdrawals: snapshot.cashFlow.withdrawals,
        };
      }
      setCashFlows(seeded);
      seededMonthRef.current = selectedYearMonth;
    };

    void loadPortfolioSnapshots();
    return () => {
      cancelled = true;
    };
  }, [auth, householdId, portfolios, selectedYearMonth, refreshKey]);

  const control = useConfirmStageControl({
    stageId: 'PORTFOLIO_CASH_FLOW',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'PORTFOLIO_CASH_FLOW', portfolioCashFlows: cashFlows }),
    resetDraft: () => setCashFlows({}),
  });

  return { ...control, cashFlows, setCashFlows, portfolioSnapshots };
};
