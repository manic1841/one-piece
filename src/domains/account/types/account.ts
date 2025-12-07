import { type Account } from '@/domains/account/types';
import { type AccountSnapshot } from '@/domains/account/types';

export type AccountWithSnapshot = Account & { snapshots: AccountSnapshot[] };

export type AssetTrendData = Array<{
  date: string;
  totalAssets: number;
  type: string; // account name
}>;
