import {
  type AccountSnapshotCreate,
  type AccountSnapshotFormData,
  CurrencyType,
} from '@/domains/account/types';
import { NO_SELECTED } from '@/ui/constants/empty';

export const toSnapshotForm = (
  accountId?: string,
  currency?: string,
  data?: AccountSnapshotCreate,
): AccountSnapshotFormData => {
  const id = accountId ?? NO_SELECTED;
  const cur = currency ?? CurrencyType.TWD;

  const current = new Date();
  if (!data) {
    return {
      accountId: id,
      currency: cur,
      year: current.getFullYear().toString(),
      month: (current.getMonth() + 1).toString(),
      amount: '',
      originalAmount: '',
      exchangeRate: '',
      holdings: [],
    };
  }

  return {
    accountId: id,
    currency: cur,
    year: data.year.toString(),
    month: data.month.toString(),
    amount: data.amount.toString(),
    originalAmount: data.originalAmount?.toString() || '',
    exchangeRate: data.exchangeRate?.toString() || '',
    holdings:
      data.holdings?.map((h) => ({
        symbol: h.symbol,
        name: h.name,
        quantity: h.quantity.toString(),
        cost: h.cost.toString(),
        marketValue: h.marketValue.toString(),
        leverage: h.leverage ? h.leverage.toString() : '',
      })) || [],
  };
};
