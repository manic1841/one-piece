import { type PortfolioSnapshot } from './portfolio';

export interface PortfolioListItemViewModel {
  id: string;
  name: string;
  description?: string;
  totalValue: number;
  asOfDate?: string; // e.g., "2024-03"
  accountCount: number;
  order: number;
}

export interface PortfolioDetailViewModel {
  id: string;
  name: string;
  description?: string;
  accountIds: string[];
  isActive: boolean;
  order: number;
  latestSnapshot: PortfolioSnapshot | null;
  history: PortfolioSnapshot[];
}
