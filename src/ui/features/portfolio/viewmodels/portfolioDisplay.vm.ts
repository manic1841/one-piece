import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';
import { formatYearMonth } from '@/ui/utils';

export type { Portfolio, PortfolioSnapshot };

export interface PortfolioListItemVM {
  id: string;
  name: string;
  totalValue: number;
  asOfDate?: string;
  accountCount: number;
  isActive: boolean;
  order: number;
}

export interface PortfolioDetailVM {
  id: string;
  name: string;
  securitiesAccountId: string;
  bankAccountId: string;
  isActive: boolean;
  order: number;
  latestSnapshot: PortfolioSnapshot | null;
  history: PortfolioSnapshot[];
}

export const mapPortfolioToListItemVM = (
  portfolio: Portfolio,
  latestSnapshot?: PortfolioSnapshot,
): PortfolioListItemVM => {
  return {
    id: portfolio.id,
    name: portfolio.name,
    totalValue: latestSnapshot?.totalValue || 0,
    asOfDate: latestSnapshot
      ? formatYearMonth(latestSnapshot.year, latestSnapshot.month)
      : undefined,
    accountCount: 2,
    isActive: portfolio.isActive,
    order: portfolio.order || 0,
  };
};

export const mapPortfolioToDetailVM = (
  portfolio: Portfolio,
  snapshots: PortfolioSnapshot[],
): PortfolioDetailVM => {
  return {
    id: portfolio.id,
    name: portfolio.name,
    securitiesAccountId: portfolio.securitiesAccountId,
    bankAccountId: portfolio.bankAccountId,
    isActive: portfolio.isActive,
    order: portfolio.order || 0,
    latestSnapshot: snapshots.length > 0 ? snapshots[0] : null,
    history: snapshots,
  };
};
