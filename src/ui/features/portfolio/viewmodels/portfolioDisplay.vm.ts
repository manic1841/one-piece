import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';
import { formatYearMonth } from '@/ui/utils';

export interface PortfolioListItemVM {
  id: string;
  name: string;
  description?: string;
  totalValue: number;
  asOfDate?: string;
  accountCount: number;
  isActive: boolean;
  order: number;
}

export interface PortfolioDetailVM {
  id: string;
  name: string;
  description?: string;
  accountIds: string[];
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
    description: portfolio.description,
    totalValue: latestSnapshot?.totalValue || 0,
    asOfDate: latestSnapshot
      ? formatYearMonth(latestSnapshot.year, latestSnapshot.month)
      : undefined,
    accountCount: portfolio.accountIds.length,
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
    description: portfolio.description,
    accountIds: portfolio.accountIds,
    isActive: portfolio.isActive,
    order: portfolio.order || 0,
    latestSnapshot: snapshots.length > 0 ? snapshots[0] : null,
    history: snapshots,
  };
};
