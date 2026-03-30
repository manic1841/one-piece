import type { Holding } from '@/domains/account/schemas';
import { type AccountSnapshot } from '@/domains/account/types/account';

export interface AccountSnapshotEditorFormVM {
  year: number;
  month: number;
  amount: number;
  originalAmount: number;
  exchangeRate: number;
  holdings: Holding[];
}

const toNumber = (value: string | number, fallback = 0): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const totalHoldingValue = (holdings: Holding[]): number => {
  return holdings.reduce((sum, item) => sum + (item.marketValue || 0), 0);
};

export const createSnapshotEditorFormVM = (
  snapshot?: AccountSnapshot,
): AccountSnapshotEditorFormVM => {
  const today = new Date();
  return {
    year: snapshot?.year ?? today.getFullYear(),
    month: snapshot?.month ?? today.getMonth() + 1,
    amount: snapshot?.amount ?? 0,
    originalAmount: snapshot?.originalAmount ?? 0,
    exchangeRate: snapshot?.exchangeRate ?? 1,
    holdings: snapshot?.holdings ?? [],
  };
};

export const applyDisplayFieldChange = (
  prev: AccountSnapshotEditorFormVM,
  field: keyof AccountSnapshotEditorFormVM,
  value: number,
  options: {
    isSecurities: boolean;
    currency: string;
  },
): AccountSnapshotEditorFormVM => {
  const next = { ...prev, [field]: value };

  if (
    options.isSecurities &&
    next.holdings.length > 0 &&
    options.currency !== 'TWD' &&
    field === 'exchangeRate'
  ) {
    return {
      ...next,
      amount: next.originalAmount * next.exchangeRate,
    };
  }

  if (
    !options.isSecurities &&
    options.currency !== 'TWD' &&
    (field === 'originalAmount' || field === 'exchangeRate')
  ) {
    return {
      ...next,
      amount: next.originalAmount * next.exchangeRate,
    };
  }

  return next;
};

export const addHoldingToForm = (
  prev: AccountSnapshotEditorFormVM,
): AccountSnapshotEditorFormVM => {
  return {
    ...prev,
    holdings: [...prev.holdings, { symbol: '', name: '', quantity: 0, cost: 0, marketValue: 0 }],
  };
};

export const removeHoldingFromForm = (
  prev: AccountSnapshotEditorFormVM,
  index: number,
  options: {
    isSecurities: boolean;
    currency: string;
  },
): AccountSnapshotEditorFormVM => {
  const holdings = [...prev.holdings];
  holdings.splice(index, 1);

  if (!options.isSecurities) {
    return { ...prev, holdings };
  }

  const total = totalHoldingValue(holdings);
  if (options.currency !== 'TWD') {
    return {
      ...prev,
      holdings,
      originalAmount: total,
      amount: total * prev.exchangeRate,
    };
  }

  return {
    ...prev,
    holdings,
    amount: total,
  };
};

export const updateHoldingInForm = (
  prev: AccountSnapshotEditorFormVM,
  index: number,
  field: keyof Holding,
  value: string | number,
  options: {
    isSecurities: boolean;
    currency: string;
  },
): AccountSnapshotEditorFormVM => {
  const holdings = [...prev.holdings];
  const nextValue = ['quantity', 'cost', 'marketValue', 'leverage'].includes(field)
    ? toNumber(value)
    : value;

  holdings[index] = {
    ...holdings[index],
    [field]: nextValue,
  };

  if (!options.isSecurities) {
    return {
      ...prev,
      holdings,
    };
  }

  const total = totalHoldingValue(holdings);
  if (options.currency !== 'TWD') {
    return {
      ...prev,
      holdings,
      originalAmount: total,
      amount: total * prev.exchangeRate,
    };
  }

  return {
    ...prev,
    holdings,
    amount: total,
  };
};

export const applyImportedHoldings = (
  prev: AccountSnapshotEditorFormVM,
  holdings: Holding[],
  options: {
    isSecurities: boolean;
    currency: string;
  },
): AccountSnapshotEditorFormVM => {
  if (!options.isSecurities) {
    return {
      ...prev,
      holdings: [],
    };
  }

  const copiedHoldings = holdings.map((holding) => ({ ...holding }));
  const total = totalHoldingValue(copiedHoldings);

  if (options.currency !== 'TWD') {
    return {
      ...prev,
      holdings: copiedHoldings,
      originalAmount: total,
      amount: total * prev.exchangeRate,
    };
  }

  return {
    ...prev,
    holdings: copiedHoldings,
    amount: total,
  };
};
