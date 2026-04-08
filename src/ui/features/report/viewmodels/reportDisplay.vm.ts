import {
  type BalanceSheetData,
  type BalanceSheetGroup,
  type CashFlowData,
  type CashFlowGroup,
  type IncomeStatementData,
  type IncomeStatementItem,
} from '@/domains/report/schemas';
import { formatCurrency } from '@/ui/utils';

export interface IncomeStatementItemVM {
  code: string;
  label: string;
  amount: number;
  amountText: string;
  subItems?: IncomeStatementItemVM[];
}

export interface IncomeStatementVM {
  yearMonth: string;
  incomeTotal: number;
  incomeTotalText: string;
  expenseTotal: number;
  expenseTotalText: string;
  netIncome: number;
  netIncomeText: string;
  incomeItems: IncomeStatementItemVM[];
  expenseItems: IncomeStatementItemVM[];
}

export interface BalanceSheetItemVM {
  code: string;
  label: string;
  amount: number;
  amountText: string;
}

export interface BalanceSheetGroupVM {
  label: string;
  total: number;
  totalText: string;
  items: BalanceSheetItemVM[];
}

export interface BalanceSheetVM {
  yearMonth: string;
  assets: {
    total: number;
    totalText: string;
    groups: Record<string, BalanceSheetGroupVM>;
  };
  liabilities: {
    total: number;
    totalText: string;
    groups: Record<string, BalanceSheetGroupVM>;
  };
  equity: {
    total: number;
    totalText: string;
    groups: Record<string, BalanceSheetGroupVM>;
  };
}

export interface CashFlowItemVM {
  code: string;
  label: string;
  amount: number;
  amountText: string;
}

export interface CashFlowGroupVM {
  label: string;
  total: number;
  totalText: string;
  inflowItems: CashFlowItemVM[];
  outflowItems: CashFlowItemVM[];
}

export interface CashFlowVM {
  yearMonth: string;
  operating: CashFlowGroupVM;
  investing: CashFlowGroupVM;
  financing: CashFlowGroupVM;
  netCashChange: number;
  netCashChangeText: string;
  beginningBalance: number;
  beginningBalanceText: string;
  endingBalance: number;
  endingBalanceText: string;
  actualBalance: number;
  actualBalanceText: string;
  adjustment: number;
  adjustmentText: string;
}

const mapIncomeStatementItemToVM = (item: IncomeStatementItem): IncomeStatementItemVM => {
  return {
    code: item.code,
    label: item.label,
    amount: item.amount,
    amountText: formatCurrency(item.amount),
    subItems: item.subItems?.map(mapIncomeStatementItemToVM),
  };
};

const mapBalanceSheetGroupToVM = (group: BalanceSheetGroup): BalanceSheetGroupVM => {
  return {
    label: group.label,
    total: group.total,
    totalText: formatCurrency(group.total),
    items: group.items.map((item) => ({
      code: item.code,
      label: item.label,
      amount: item.amount,
      amountText: formatCurrency(item.amount),
    })),
  };
};

const mapCashFlowGroupToVM = (group: CashFlowGroup): CashFlowGroupVM => {
  return {
    label: group.label,
    total: group.total,
    totalText: formatCurrency(group.total),
    inflowItems: group.inflowItems.map((item) => ({
      code: item.code,
      label: item.label,
      amount: item.amount,
      amountText: formatCurrency(item.amount),
    })),
    outflowItems: group.outflowItems.map((item) => ({
      code: item.code,
      label: item.label,
      amount: item.amount,
      amountText: formatCurrency(item.amount),
    })),
  };
};

export const mapIncomeStatementToVM = (data: IncomeStatementData): IncomeStatementVM => {
  return {
    yearMonth: data.yearMonth,
    incomeTotal: data.incomeTotal,
    incomeTotalText: formatCurrency(data.incomeTotal),
    expenseTotal: data.expenseTotal,
    expenseTotalText: formatCurrency(data.expenseTotal),
    netIncome: data.netIncome,
    netIncomeText: formatCurrency(data.netIncome),
    incomeItems: data.incomeItems.map(mapIncomeStatementItemToVM),
    expenseItems: data.expenseItems.map(mapIncomeStatementItemToVM),
  };
};

export const mapBalanceSheetToVM = (data: BalanceSheetData): BalanceSheetVM => {
  const mapGroups = (
    groups: Record<string, BalanceSheetGroup>,
  ): Record<string, BalanceSheetGroupVM> => {
    return Object.fromEntries(
      Object.entries(groups).map(([key, group]) => [key, mapBalanceSheetGroupToVM(group)]),
    );
  };

  return {
    yearMonth: data.yearMonth,
    assets: {
      total: data.assets.total,
      totalText: formatCurrency(data.assets.total),
      groups: mapGroups(data.assets.groups),
    },
    liabilities: {
      total: data.liabilities.total,
      totalText: formatCurrency(data.liabilities.total),
      groups: mapGroups(data.liabilities.groups),
    },
    equity: {
      total: data.equity.total,
      totalText: formatCurrency(data.equity.total),
      groups: mapGroups(data.equity.groups),
    },
  };
};

export const mapCashFlowToVM = (data: CashFlowData): CashFlowVM => {
  return {
    yearMonth: data.yearMonth,
    operating: mapCashFlowGroupToVM(data.operating),
    investing: mapCashFlowGroupToVM(data.investing),
    financing: mapCashFlowGroupToVM(data.financing),
    netCashChange: data.netCashChange,
    netCashChangeText: formatCurrency(data.netCashChange),
    beginningBalance: data.beginningBalance,
    beginningBalanceText: formatCurrency(data.beginningBalance),
    endingBalance: data.endingBalance,
    endingBalanceText: formatCurrency(data.endingBalance),
    actualBalance: data.actualBalance,
    actualBalanceText: formatCurrency(data.actualBalance),
    adjustment: data.adjustment,
    adjustmentText: formatCurrency(data.adjustment),
  };
};
