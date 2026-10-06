import {
  calculatePortfolioPeriodPerformance,
  calculatePortfolioTotal,
} from '@/domains/portfolio/calculators/portfolioCalculator';
import { type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';
import { formatCurrency, formatCurrencyOrDash, formatPercentage } from '@/ui/utils';

export type { PortfolioSnapshot };

export interface PortfolioCashFlowSectionVM {
  portfolioId: string;
  portfolioName: string;
  securitiesBalanceText: string;
  bankBalanceText: string;
  deposits: number | undefined;
  withdrawals: number | undefined;
  netCashFlow: number;
  openingValue: number;
  gain: number;
  gainText: string;
  returnRate: number;
  returnRateText: string;
}

export interface PortfolioBalanceVM {
  securities: number | null;
  bank: number | null;
}

const buildSection = (
  portfolio: { id: string; name: string },
  snapshot: PortfolioSnapshot | null,
  balance: PortfolioBalanceVM | undefined,
  openingValue: number,
  cashFlow: { deposits: number; withdrawals: number } | undefined,
): PortfolioCashFlowSectionVM => {
  const deposits = cashFlow?.deposits ?? snapshot?.cashFlow.deposits;
  const withdrawals = cashFlow?.withdrawals ?? snapshot?.cashFlow.withdrawals;
  const netCashFlow = (deposits ?? 0) - (withdrawals ?? 0);
  const securitiesBalance = balance?.securities ?? null;
  const bankBalance = balance?.bank ?? null;
  // Live derivation shares the write path's formula: the closing value is the
  // linked accounts' current balance total and the opening value the previous
  // month's portfolio total — what the snapshot write path would freeze.
  const { gain, returnRate } = calculatePortfolioPeriodPerformance({
    openingValue,
    closingValue: (securitiesBalance ?? 0) + (bankBalance ?? 0),
    deposits: deposits ?? 0,
    withdrawals: withdrawals ?? 0,
  });
  return {
    portfolioId: portfolio.id,
    portfolioName: portfolio.name,
    securitiesBalanceText: formatCurrencyOrDash(securitiesBalance),
    bankBalanceText: formatCurrencyOrDash(bankBalance),
    deposits,
    withdrawals,
    netCashFlow,
    openingValue,
    gain,
    gainText: formatCurrency(gain),
    returnRate,
    returnRateText: formatPercentage(returnRate, 2),
  };
};

export const buildPortfolioCashFlowSections = ({
  portfolios,
  snapshots,
  balances,
  openingValues,
  portfolioCashFlows,
}: {
  portfolios: { id: string; name: string }[];
  snapshots: Map<string, PortfolioSnapshot | null>;
  balances: Record<string, PortfolioBalanceVM>;
  openingValues: Record<string, number>;
  portfolioCashFlows: Record<string, { deposits: number; withdrawals: number }>;
}): PortfolioCashFlowSectionVM[] =>
  portfolios.map((portfolio) =>
    buildSection(
      portfolio,
      snapshots.get(portfolio.id) ?? null,
      balances[portfolio.id],
      openingValues[portfolio.id] ?? 0,
      portfolioCashFlows[portfolio.id],
    ),
  );

export interface PortfolioCashFlowTotalVM {
  gain: number;
  gainText: string;
  returnRate: number;
  returnRateText: string;
}

export const buildPortfolioCashFlowTotal = (
  sections: PortfolioCashFlowSectionVM[],
): PortfolioCashFlowTotalVM => {
  const { gain, returnRate } = calculatePortfolioTotal(
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
  return {
    gain,
    gainText: formatCurrency(gain),
    returnRate,
    returnRateText: formatPercentage(returnRate, 2),
  };
};

export const shouldUseAccordion = (portfolioCount: number): boolean => portfolioCount >= 4;
