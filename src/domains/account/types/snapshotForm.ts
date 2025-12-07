export interface AccountSnapshotFormData {
  accountId: string;
  currency: string;
  year: string;
  month: string;
  amount: string;
  holdings: Array<{
    symbol: string;
    name: string;
    quantity: string;
    marketValue: string;
    leverage: string;
  }>;
}
