import { useEffect, useRef } from 'react';

import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/schemas';

type PortfolioCashFlows = Record<string, { deposits: number; withdrawals: number }>;

interface UsePortfolioCashFlowPrefillArgs {
  selectedYearMonth: string;
  portfolios: Portfolio[];
  /** Month-scoped snapshots; all present before the draft is seeded. */
  portfolioSnapshots: Map<string, PortfolioSnapshot | null>;
  setCashFlows: React.Dispatch<React.SetStateAction<PortfolioCashFlows>>;
}

/**
 * Seeds the cash-flow draft from the month's existing snapshots so a
 * re-confirmation submits the booked flows instead of zero-filling them
 * (same-key overwrite with an empty draft would silently erase the flows).
 * Seeds once per month; user edits after the seed are never overwritten.
 */
export const usePortfolioCashFlowPrefill = ({
  selectedYearMonth,
  portfolios,
  portfolioSnapshots,
  setCashFlows,
}: UsePortfolioCashFlowPrefillArgs) => {
  const seededMonthRef = useRef<string | null>(null);

  useEffect(() => {
    if (seededMonthRef.current === selectedYearMonth) return;
    if (!selectedYearMonth || portfolios.length === 0) return;
    if (portfolioSnapshots.size < portfolios.length) return;

    const seeded: PortfolioCashFlows = {};
    for (const portfolio of portfolios) {
      const snapshot = portfolioSnapshots.get(portfolio.id);
      if (!snapshot) return;
      seeded[portfolio.id] = {
        deposits: snapshot.cashFlow.deposits,
        withdrawals: snapshot.cashFlow.withdrawals,
      };
    }
    setCashFlows(seeded);
    seededMonthRef.current = selectedYearMonth;
  }, [portfolioSnapshots, portfolios, selectedYearMonth, setCashFlows]);
};
