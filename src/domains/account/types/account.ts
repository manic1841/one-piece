import { type Account } from '@/domains/account/types';
import { type AccountSnapshot } from '@/domains/account/types';

export type AccountWithSnapshot = Account & { snapshot: AccountSnapshot | null };

export interface AssetDataPoint {
  date: string;
  totalAssets: number;
  accounts: Record<string, number>;
}

export interface ChartDataPoint {
  month: string;
  amount: number;
  date: Date;
}
