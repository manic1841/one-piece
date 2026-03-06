export type AssetTrendViewMode = 'month' | 'season' | 'year';

export interface TrendDataPoint {
  year: number;
  month: number;
  label?: string; // e.g. "2024 Q1" or "2024"
  income: number | null;
  expense: number | null;
  totalAssets: number | null;
  investmentGain: number | null;
}

export interface AssetTrendData {
  points: TrendDataPoint[];
}

export interface UnsettledItem {
  id: string;
  name: string;
  type: 'project' | 'account' | 'portfolio';
}

export interface UnsettledStats {
  year: number;
  month: number;
  unsettledProjects: UnsettledItem[];
  unsettledAccounts: UnsettledItem[];
  unsettledPortfolios: UnsettledItem[];
  totalUnsettled: number;
}

export interface LeverageStats {
  totalExposure: number;
  totalNetValue: number;
  ratio: number;
}
