export interface PortfolioFormData {
  name: string;
  description?: string;
  accountIds: string[];
  isActive: boolean;
  order: number;
}

export interface PortfolioSnapshotFormData {
  year: number;
  month: number;
  deposits: number;
  withdrawals: number;
}
