import { type AccountSnapshotCreate, type AccountSnapshotFormData } from '@/domains/account/types';

export const toSnapshot = (data: AccountSnapshotFormData): AccountSnapshotCreate => {
  return {
    year: parseInt(data.year),
    month: parseInt(data.month),
    amount: parseFloat(data.amount),
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
