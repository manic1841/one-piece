import { formatCurrency } from '@/ui/utils';

export interface SettlementPreviewItemVM {
  projectId: string;
  projectName: string;
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
  openingBalanceText: string;
  incomeText: string;
  expenseText: string;
  closingBalanceText: string;
}

export const mapSettlementToPreviewVM = (settlement: {
  projectId: string;
  projectName: string;
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
}): SettlementPreviewItemVM => {
  return {
    ...settlement,
    openingBalanceText: formatCurrency(settlement.openingBalance),
    incomeText: formatCurrency(settlement.income),
    expenseText: formatCurrency(settlement.expense),
    closingBalanceText: formatCurrency(settlement.closingBalance),
  };
};
