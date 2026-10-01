import { useCallback } from 'react';

import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { type AuthContext } from '@/application/types';
import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/schemas';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useSeededDraft } from '@/ui/features/monthly_close/hooks/useSeededDraft';
import { useStageLoader } from '@/ui/features/monthly_close/hooks/useStageLoader';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { logger } from '@/utils/logger';

type PortfolioCashFlows = Record<string, { deposits: number; withdrawals: number }>;

interface UsePortfolioCashFlowStageArgs {
  householdId: string;
  selectedYearMonth: string;
  portfolios: Portfolio[];
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
 * usePortfolioSnapshotPrefill). The draft is seeded by `useSeededDraft` from the
 * month's booked flows once every snapshot has loaded (all-or-nothing), so a
 * re-confirmation submits the booked flows instead of zero-filling them; edits
 * after the seed are never overwritten. `control.refresh` re-fetches the display
 * after a confirm. A load failure surfaces the canned message without blocking
 * confirm.
 */
export const usePortfolioCashFlowStage = ({
  householdId,
  selectedYearMonth,
  portfolios,
  confirmingStageId,
  enabled = true,
}: UsePortfolioCashFlowStageArgs): CloseStageControl & {
  cashFlows: PortfolioCashFlows | null;
  setCashFlows: (value: PortfolioCashFlows) => void;
  portfolioSnapshots: Map<string, PortfolioSnapshot | null>;
  errorMessage: string | null;
} => {
  const auth = useAuthIdentity();

  const load = useCallback(
    () => fetchPortfolioSnapshots({ householdId, selectedYearMonth, portfolios, auth }),
    [auth, householdId, portfolios, selectedYearMonth],
  );
  // The gate waits for the shared portfolios list, so the prefill never runs
  // against an empty list; the loader runs it when the gate flips.
  const { data, errorMessage, refresh } = useStageLoader<PortfolioSnapshotData>({
    key: selectedYearMonth,
    enabled: enabled && householdId !== '' && selectedYearMonth !== '' && portfolios.length > 0,
    load,
  });
  // `booked: null` means at least one snapshot is missing — an unknown, not an
  // empty draft — so the draft waits instead of seeding zeros.
  const [cashFlows, setCashFlows] = useSeededDraft<PortfolioCashFlows>(
    selectedYearMonth,
    data?.booked ?? null,
  );

  const control = useConfirmStageControl({
    stageId: 'PORTFOLIO_CASH_FLOW',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'PORTFOLIO_CASH_FLOW', portfolioCashFlows: cashFlows ?? {} }),
    refresh,
  });

  return {
    ...control,
    cashFlows,
    setCashFlows,
    portfolioSnapshots: data?.snapshots ?? new Map<string, PortfolioSnapshot | null>(),
    errorMessage,
  };
};
