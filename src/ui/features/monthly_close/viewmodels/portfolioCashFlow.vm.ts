import {
  calculatePortfolioPeriodPerformance,
  calculatePortfolioTotal,
} from '@/domains/portfolio/calculators/portfolioCalculator';
import { type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';

export type { PortfolioSnapshot };

export interface PortfolioCashFlowSectionVM {
  portfolioId: string;
  portfolioName: string;
  securitiesBalance: number | null;
  bankBalance: number | null;
  deposits: number | undefined;
  withdrawals: number | undefined;
  netCashFlow: number;
  openingValue: number;
  gain: number;
  returnRate: number;
}

const balanceOf = (snapshot: PortfolioSnapshot, category: 'bank' | 'securities'): number | null => {
  const account = snapshot.accounts.find((entry) => entry.category === category);
  return account ? account.value : null;
};

const buildSection = (
  portfolio: { id: string; name: string },
  snapshot: PortfolioSnapshot | null,
  cashFlow: { deposits: number; withdrawals: number } | undefined,
): PortfolioCashFlowSectionVM => {
  const deposits = cashFlow?.deposits ?? snapshot?.cashFlow.deposits;
  const withdrawals = cashFlow?.withdrawals ?? snapshot?.cashFlow.withdrawals;
  const netCashFlow = (deposits ?? 0) - (withdrawals ?? 0);
  const securitiesBalance = snapshot ? balanceOf(snapshot, 'securities') : null;
  const bankBalance = snapshot ? balanceOf(snapshot, 'bank') : null;
  // Live derivation shares the write path's formula; closing value equals the
  // displayed balances, which is what the snapshot write path sums.
  const { gain, returnRate } = calculatePortfolioPeriodPerformance({
    openingValue: snapshot?.performance.openingValue ?? 0,
    closingValue: (securitiesBalance ?? 0) + (bankBalance ?? 0),
    deposits: deposits ?? 0,
    withdrawals: withdrawals ?? 0,
  });
  return {
    portfolioId: portfolio.id,
    portfolioName: portfolio.name,
    securitiesBalance,
    bankBalance,
    deposits,
    withdrawals,
    netCashFlow,
    openingValue: snapshot?.performance.openingValue ?? 0,
    gain,
    returnRate,
  };
};

export const buildPortfolioCashFlowSections = ({
  portfolios,
  snapshots,
  portfolioCashFlows,
}: {
  portfolios: { id: string; name: string }[];
  snapshots: Map<string, PortfolioSnapshot | null>;
  portfolioCashFlows: Record<string, { deposits: number; withdrawals: number }>;
}): PortfolioCashFlowSectionVM[] =>
  portfolios.map((portfolio) =>
    buildSection(portfolio, snapshots.get(portfolio.id) ?? null, portfolioCashFlows[portfolio.id]),
  );

export const buildPortfolioCashFlowTotal = (
  sections: PortfolioCashFlowSectionVM[],
): { gain: number; returnRate: number } =>
  calculatePortfolioTotal(
    sections.map((section) => ({
      performance: {
        openingValue: section.openingValue,
        closingValue: 0,
        netCashFlow: section.netCashFlow,
        gain: section.gain,
        returnRate: section.returnRate,
        cumulativeGain: 0,
        cumulativeReturnRate: 0,
      },
    })),
  );

export const shouldUseAccordion = (portfolioCount: number): boolean => portfolioCount >= 4;
