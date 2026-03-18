import { type AccountSnapshotCreate, type AccountSnapshotFormData } from '@/domains/account/types';

export const toSnapshot = (data: AccountSnapshotFormData): AccountSnapshotCreate => {
  return {
    accountId: data.accountId,
    year: parseInt(data.year),
    month: parseInt(data.month),
    amount: parseFloat(data.amount),
    ...(data.originalAmount ? { originalAmount: parseFloat(data.originalAmount) } : {}),
    ...(data.exchangeRate ? { exchangeRate: parseFloat(data.exchangeRate) } : {}),
    holdings: data.holdings.map((holding) => ({
      symbol: holding.symbol,
      name: holding.name,
      quantity: parseFloat(holding.quantity),
      cost: parseFloat(holding.cost),
      marketValue: parseFloat(holding.marketValue),
      leverage: parseFloat(holding.leverage),
    })),
  };
};
