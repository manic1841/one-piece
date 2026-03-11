export interface AccountSnapshotFormData {
  accountId: string;
  currency: string;
  year: string;
  month: string;
  amount: string;
  originalAmount: string;
  exchangeRate: string;
  holdings: Array<{
    symbol: string;
    name: string;
    quantity: string;
    cost: string;
    marketValue: string;
    leverage: string;
  }>;
}
