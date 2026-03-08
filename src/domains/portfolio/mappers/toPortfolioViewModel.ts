import { formatYearMonth } from '@/utils/dateUtils';

import {
  type Portfolio,
  type PortfolioDetailViewModel,
  type PortfolioListItemViewModel,
  type PortfolioSnapshot,
} from '../types';

export const toPortfolioListItemViewModel = (
  portfolio: Portfolio,
  latestSnapshot?: PortfolioSnapshot,
): PortfolioListItemViewModel => {
  return {
    id: portfolio.id,
    name: portfolio.name,
    description: portfolio.description,
    totalValue: latestSnapshot?.totalValue || 0,
    asOfDate: latestSnapshot
      ? formatYearMonth(latestSnapshot.year, latestSnapshot.month)
      : undefined,
    accountCount: portfolio.accountIds.length,
    order: portfolio.order || 0,
  };
};

export const toPortfolioDetailViewModel = (
  portfolio: Portfolio,
  snapshots: PortfolioSnapshot[],
): PortfolioDetailViewModel => {
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
