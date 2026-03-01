import { AssetSubCategory } from '@/domains/finance/types';
import type { BalanceSheetData, BalanceSheetItem } from '@/schemas/balanceSheet';
import type { CashFlowData } from '@/schemas/cashFlow';

export function createCashFlow(
  endingBalance: number,
  beginningBalance: number = 50000,
  netChange: number = 0,
): CashFlowData {
  return {
    operating: {
      income: [],
      expense: [],
      netAmount: netChange,
      items: [],
    },
    investing: {
      income: [],
      expense: [],
      netAmount: 0,
      items: [],
    },
    financing: {
      income: [],
      expense: [],
      netAmount: 0,
      items: [],
    },
    netChange,
    beginningBalance,
    endingBalance,
  };
}

export function createBalanceSheet(
  cashAmount: number,
  liabilitiesTotal: number,
  equityTotal: number,
  includeInvestments: boolean = false,
): BalanceSheetData {
  const assetItems: BalanceSheetItem[] = [
    {
      category: AssetSubCategory.CASH,
      amount: cashAmount,
      subItems: [],
    },
  ];

  if (includeInvestments) {
    assetItems.push({
      category: AssetSubCategory.INVESTMENTS,
      amount: 50000,
      subItems: [],
    });
  }

  const assetsTotal = assetItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    assets: {
      total: assetsTotal,
      items: assetItems,
    },
    liabilities: {
      total: liabilitiesTotal,
      items:
        liabilitiesTotal > 0
          ? [
              {
                category: 'Short-term Debt',
                amount: liabilitiesTotal,
                subItems: [],
              },
            ]
          : [],
    },
    equity: {
      total: equityTotal,
      items:
        equityTotal > 0
          ? [
              {
                category: 'Retained Earnings',
                amount: equityTotal,
                subItems: [],
              },
            ]
          : [],
    },
  };
}
