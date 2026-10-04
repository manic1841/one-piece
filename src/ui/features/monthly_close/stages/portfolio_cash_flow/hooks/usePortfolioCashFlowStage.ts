import { useCallback } from 'react';

import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
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
}

const LOAD_ERROR = '無法載入 Portfolio 金流，請稍後再試。';

/** The linked account balances shown read-only beside the cash-flow inputs. */
export interface PortfolioBalanceValues {
  securities: number | null;
  bank: number | null;
}

interface PortfolioSnapshotData {
  snapshots: Map<string, PortfolioSnapshot | null>;
  /** The month's booked flows, or null when any portfolio has no snapshot yet. */
  booked: PortfolioCashFlows | null;
  /** Previous month's portfolio total per portfolio — this month's opening value. */
  openingValues: Record<string, number>;
  /** Live securities/bank balances read from the linked account snapshots. */
  balances: Record<string, PortfolioBalanceValues>;
}

const previousYearMonth = (year: number, month: number): { year: number; month: number } =>
  month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

/**
 * The account's balance for the month, falling back to the previous month so a
 * month whose snapshot is not written yet still shows the last observed value;
 * null means neither month has one, which the view renders as an em dash.
 */
const readAccountBalance = async ({
  householdId,
  accountId,
  year,
  month,
  auth,
}: {
  householdId: string;
  accountId: string;
  year: number;
  month: number;
  auth: AuthContext;
}): Promise<number | null> => {
  const readAt = async (atYear: number, atMonth: number) => {
    const snapshots = await getAccountSnapshotsUseCase.execute({
      householdId,
      accountId,
      year: atYear,
      month: atMonth,
      auth,
    });
    return snapshots[0] ?? null;
  };
  const current = await readAt(year, month);
  if (current) return current.amount;
  const previous = previousYearMonth(year, month);
  const fallback = await readAt(previous.year, previous.month);
  return fallback?.amount ?? null;
};

/**
 * Loads the month's snapshot per portfolio, the previous month's total (the
 * opening value) and the linked accounts' live balances. A read failure throws
 * the canned message so the surface shows copy the consumer owns instead of a
 * silently empty panel.
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
  const previous = previousYearMonth(year, month);
  try {
    const entries = await Promise.all(
      portfolios.map(async (portfolio) => {
        const [current, prior, securities, bank] = await Promise.all([
          listPortfolioSnapshotsUseCase.execute({
            householdId,
            portfolioId: portfolio.id,
            year,
            month,
            auth,
          }),
          listPortfolioSnapshotsUseCase.execute({
            householdId,
            portfolioId: portfolio.id,
            year: previous.year,
            month: previous.month,
            auth,
          }),
          readAccountBalance({
            householdId,
            accountId: portfolio.securitiesAccountId,
            year,
            month,
            auth,
          }),
          readAccountBalance({
            householdId,
            accountId: portfolio.bankAccountId,
            year,
            month,
            auth,
          }),
        ]);
        return {
          portfolioId: portfolio.id,
          snapshot: current[0] ?? null,
          openingValue: prior[0]?.totalValue ?? 0,
          balance: { securities, bank },
        };
      }),
    );
    const snapshots = new Map(entries.map((entry) => [entry.portfolioId, entry.snapshot]));
    const openingValues: Record<string, number> = {};
    const balances: Record<string, PortfolioBalanceValues> = {};
    const booked: PortfolioCashFlows = {};
    let everySettled = true;
    for (const entry of entries) {
      openingValues[entry.portfolioId] = entry.openingValue;
      balances[entry.portfolioId] = entry.balance;
      if (entry.snapshot) {
        booked[entry.portfolioId] = {
          deposits: entry.snapshot.cashFlow.deposits,
          withdrawals: entry.snapshot.cashFlow.withdrawals,
        };
      } else {
        everySettled = false;
      }
    }
    // Seed only when every portfolio has a snapshot (all-or-nothing), so a
    // partially settled month does not seed a half-filled draft.
    return { snapshots, booked: everySettled ? booked : null, openingValues, balances };
  } catch (caught) {
    logger.warn('Failed to load portfolio snapshots', 'usePortfolioCashFlowStage', { caught });
    throw new Error(LOAD_ERROR);
  }
};

/** Stage controller for PORTFOLIO_CASH_FLOW: the cash-flow draft and its month snapshot data. */
export const usePortfolioCashFlowStage = ({
  householdId,
  selectedYearMonth,
  portfolios,
  confirmingStageId,
}: UsePortfolioCashFlowStageArgs): CloseStageControl<'PORTFOLIO_CASH_FLOW'> & {
  cashFlows: PortfolioCashFlows | null;
  setCashFlows: (value: PortfolioCashFlows) => void;
  portfolioSnapshots: Map<string, PortfolioSnapshot | null>;
  openingValues: Record<string, number>;
  balances: Record<string, PortfolioBalanceValues>;
  errorMessage: string | null;
} => {
  const auth = useAuthIdentity();

  const load = useCallback(
    () => fetchPortfolioSnapshots({ householdId, selectedYearMonth, portfolios, auth }),
    [auth, householdId, portfolios, selectedYearMonth],
  );
  // The gate waits for the shared portfolios list, so the prefill never runs on an empty list.
  const { data, errorMessage, refresh } = useStageLoader<PortfolioSnapshotData>({
    enabled: householdId !== '' && selectedYearMonth !== '' && portfolios.length > 0,
    load,
  });
  // `booked: null` means at least one snapshot is missing: an unknown, not an empty draft.
  const [cashFlows, setCashFlows] = useSeededDraft<PortfolioCashFlows>(data?.booked ?? null);

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
    openingValues: data?.openingValues ?? {},
    balances: data?.balances ?? {},
    errorMessage,
  };
};
