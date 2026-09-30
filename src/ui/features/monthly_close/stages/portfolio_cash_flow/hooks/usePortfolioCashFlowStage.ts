import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { type AuthContext } from '@/application/types';
import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/schemas';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { logger } from '@/utils/logger';

type PortfolioCashFlows = Record<string, { deposits: number; withdrawals: number }>;

interface UsePortfolioCashFlowStageArgs {
  householdId: string;
  selectedYearMonth: string;
  portfolios: Portfolio[];
  auth: AuthContext;
  confirmingStageId: string | null;
  enabled?: boolean;
}

const LOAD_ERROR = '無法載入 Portfolio 金流，請稍後再試。';

interface PortfolioSnapshotData {
  snapshots: Map<string, PortfolioSnapshot | null>;
  /** The month's booked flows, or null when any portfolio has no snapshot yet. */
  booked: PortfolioCashFlows | null;
}

/**
 * Loads the month's snapshot per portfolio. A read failure throws the canned
 * message so the surface shows copy the consumer owns instead of a silently
 * empty panel.
 */
const fetchPortfolioSnapshots = async ({
  householdId,
  selectedYearMonth,
  portfolios,
  auth,
}: {
  householdId: string;
  selectedYearMonth: string;
  portfolios: Portfolio[];
  auth: AuthContext;
}): Promise<PortfolioSnapshotData> => {
  const year = Number(selectedYearMonth.slice(0, 4));
  const month = Number(selectedYearMonth.slice(5, 7));
  try {
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
    const snapshots = new Map(entries);
    // Seed only when every portfolio has a snapshot (all-or-nothing), so a
    // partially settled month does not seed a half-filled draft.
    const booked: PortfolioCashFlows = {};
    for (const [portfolioId, snapshot] of entries) {
      if (!snapshot) return { snapshots, booked: null };
      booked[portfolioId] = {
        deposits: snapshot.cashFlow.deposits,
        withdrawals: snapshot.cashFlow.withdrawals,
      };
    }
    return { snapshots, booked };
  } catch (caught) {
    logger.warn('Failed to load portfolio snapshots', 'usePortfolioCashFlowStage', { caught });
    throw new Error(LOAD_ERROR);
  }
};

/**
 * Stage controller for PORTFOLIO_CASH_FLOW: owns the cash-flow draft the
 * sections edit and the month-scoped snapshot display data (absorbed from
 * usePortfolioSnapshotPrefill). The draft seeds from the month's booked flows
 * once snapshots have loaded, so a re-confirmation submits the booked flows
 * instead of zero-filling them; user edits after the seed are never
 * overwritten. `control.refresh` re-fetches the display after a confirm. A load
 * failure surfaces the canned message without blocking confirm.
 */
export const usePortfolioCashFlowStage = ({
  householdId,
  selectedYearMonth,
  portfolios,
  auth,
  confirmingStageId,
  enabled = true,
}: UsePortfolioCashFlowStageArgs): CloseStageControl & {
  cashFlows: PortfolioCashFlows;
  setCashFlows: React.Dispatch<React.SetStateAction<PortfolioCashFlows>>;
  portfolioSnapshots: Map<string, PortfolioSnapshot | null>;
  errorMessage: string | null;
} => {
  const [cashFlows, setCashFlows] = useState<PortfolioCashFlows>({});
  const [data, setData] = useState<{
    yearMonth: string;
    snapshots: Map<string, PortfolioSnapshot | null>;
  } | null>(null);
  const seededMonthRef = useRef<string | null>(null);
  const { errorMessage, run } = useLoadingTask();
  // A slow load for a month the user already left must not land last and win.
  const inFlightRef = useRef<AbortController | null>(null);

  const portfolioSnapshots = useMemo(
    () => (data?.yearMonth === selectedYearMonth ? data.snapshots : new Map()),
    [data, selectedYearMonth],
  );

  const load = useCallback(async () => {
    if (!householdId || !selectedYearMonth || portfolios.length === 0) return;
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    await run(() => fetchPortfolioSnapshots({ householdId, selectedYearMonth, portfolios, auth }), {
      signal: controller.signal,
      writeBack: (result) => {
        if (!result.ok) return;
        setData({ yearMonth: selectedYearMonth, snapshots: result.value.snapshots });
        // Seed the draft from the month's booked flows once all snapshots are
        // present; seeds once per month and never overwrites user edits.
        if (!result.value.booked) return;
        if (seededMonthRef.current === selectedYearMonth) return;
        setCashFlows(result.value.booked);
        seededMonthRef.current = selectedYearMonth;
      },
    });
  }, [auth, householdId, portfolios, run, selectedYearMonth]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  const control = useConfirmStageControl({
    stageId: 'PORTFOLIO_CASH_FLOW',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'PORTFOLIO_CASH_FLOW', portfolioCashFlows: cashFlows }),
    resetDraft: () => setCashFlows({}),
    refresh: load,
  });

  return { ...control, cashFlows, setCashFlows, portfolioSnapshots, errorMessage };
};
