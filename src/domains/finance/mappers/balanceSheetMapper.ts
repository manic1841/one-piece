import type { BalanceSheetData, BalanceSheetItem } from '@/domains/finance/types';
import {
  AssetSubCategory,
  EquitySubCategory,
  LiabilitySubCategory,
} from '@/domains/finance/types/categories';
import type { FinancialReport } from '@/schemas/report';

export interface BalanceSheetView {
  id: string;
  asOfDate: Date;
  year: number;
  month: number;
  assets: {
    total: number;
    current: Array<{
      category: string;
      subtotal: number;
      items: Array<{ id: string; name: string; amount: number }>;
    }>;
    investment: Array<{
      category: string;
      subtotal: number;
      items: Array<{ id: string; name: string; amount: number }>;
    }>;
    fixed: Array<{
      category: string;
      subtotal: number;
      items: Array<{ id: string; name: string; amount: number }>;
    }>;
  };
  liabilities: {
    total: number;
    shortTerm: Array<{
      category: string;
      subtotal: number;
      items: Array<{ id: string; name: string; amount: number }>;
    }>;
    longTerm: Array<{
      category: string;
      subtotal: number;
      items: Array<{ id: string; name: string; amount: number }>;
    }>;
  };
  equity: {
    total: number;
    items: Array<{
      category: string;
      subtotal: number;
      items: Array<{ id: string; name: string; amount: number }>;
    }>;
  };
  netWorth: number;
  adjustments: Array<{ name: string; amount: number }>;
  createdAt: Date;
  createdBy: string;
}

/**
 * Map FinancialReport to BalanceSheetView format
 */
export const mapToBalanceSheetView = (report: FinancialReport): BalanceSheetView | null => {
  if (report.type !== 'balance_sheet' || !('assets' in report.data)) return null;
  const data = report.data as BalanceSheetData;

  // 1. Extract and separate adjustments (system-generated items)
  const adjustments: Array<{ name: string; amount: number }> = [];
  const findAndExtractAdjustments = (items: BalanceSheetItem[]) => {
    items.forEach((item) => {
      // Only extract subItems to adjustments if the entire category is RECONCILIATION
      if (item.category === EquitySubCategory.RECONCILIATION) {
        item.subItems?.forEach((sub) => {
          adjustments.push({ name: sub.name, amount: sub.amount });
        });
      }
    });
  };

  findAndExtractAdjustments(data.assets.items);
  findAndExtractAdjustments(data.liabilities.items);
  findAndExtractAdjustments(data.equity.items);

  // 2. Helper to map items to categories
  const mapNormalItems = (items: BalanceSheetItem[]) => {
    return items
      .filter((item) => item.category !== EquitySubCategory.RECONCILIATION)
      .map((item) => {
        const subItems = item.subItems || [];

        return {
          category: item.category,
          subtotal: item.amount,
          items: subItems.map((sub, idx) => ({
            id: `${item.category}-${idx}`,
            name: sub.name,
            amount: sub.amount,
          })),
        };
      })
      .filter((cat) => cat.items.length > 0 || cat.subtotal !== 0);
  };

  const calculateTotal = (categories: ReturnType<typeof mapNormalItems>) =>
    categories.reduce((sum, cat) => sum + cat.subtotal, 0);

  // 3. Map sections
  const currentAssets = mapNormalItems(
    data.assets.items.filter(
      (i) => i.category === AssetSubCategory.CASH || i.category === AssetSubCategory.OTHER_ASSETS,
    ),
  );
  const investmentAssets = mapNormalItems(
    data.assets.items.filter((i) => i.category === AssetSubCategory.INVESTMENTS),
  );
  const fixedAssets = mapNormalItems(
    data.assets.items.filter((i) => i.category === AssetSubCategory.REAL_ESTATE),
  );

  const shortTermLiabilities = mapNormalItems(
    data.liabilities.items.filter(
      (i) =>
        i.category === LiabilitySubCategory.SHORT_TERM_DEBT ||
        i.category === LiabilitySubCategory.OTHER_LIABILITIES,
    ),
  );
  const longTermLiabilities = mapNormalItems(
    data.liabilities.items.filter((i) => i.category === LiabilitySubCategory.LONG_TERM_DEBT),
  );

  const equityItems = mapNormalItems(data.equity.items);

  // 4. Calculate clean totals
  const totalManualAssets =
    calculateTotal(currentAssets) + calculateTotal(investmentAssets) + calculateTotal(fixedAssets);
  const totalManualLiabilities =
    calculateTotal(shortTermLiabilities) + calculateTotal(longTermLiabilities);
  const totalManualEquity = calculateTotal(equityItems);

  // Ground Truth (comes from the pre-calculated report data)
  const finalEquityTotal = data.equity.total;

  return {
    id: report.id,
    asOfDate: report.endDate,
    year: report.year,
    month: report.month,
    assets: {
      total: totalManualAssets,
      current: currentAssets,
      investment: investmentAssets,
      fixed: fixedAssets,
    },
    liabilities: {
      total: totalManualLiabilities,
      shortTerm: shortTermLiabilities,
      longTerm: longTermLiabilities,
    },
    equity: {
      total: totalManualEquity,
      items: equityItems,
    },
    netWorth: finalEquityTotal, // Use the adjusted total as the "official" net worth
    adjustments,
    createdAt: report.generatedAt,
    createdBy: report.generatedBy,
  };
};
