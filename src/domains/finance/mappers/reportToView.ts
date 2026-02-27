import { BalanceSheetSourceType, CashFlowSourceType } from '@/domains/finance/financeType';
import type {
  BalanceSheetData,
  BalanceSheetItem,
  CashFlowData,
  IncomeStatementData,
} from '@/domains/finance/types';
import { AssetSubCategory, LiabilitySubCategory } from '@/domains/finance/types/categories';
import type { CashFlowItem } from '@/schemas/cashFlow';
import type { FinancialReport } from '@/schemas/report';

// View types for the components
export interface IncomeStatementView {
  id: string;
  startDate: Date;
  endDate: Date;
  periodType: 'monthly';
  year: number;
  month: number;
  income: {
    total: number;
    categories: Array<{
      category: string;
      subtotal: number;
      items: Array<{
        id: string;
        category: string;
        subcategory: string;
        amount: number;
      }>;
    }>;
  };
  expense: {
    total: number;
    categories: Array<{
      category: string;
      subtotal: number;
      items: Array<{
        id: string;
        category: string;
        subcategory: string;
        amount: number;
      }>;
    }>;
  };
  netIncome: number;
  createdAt: Date;
  createdBy: string;
}

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

export interface CashFlowView {
  id: string;
  startDate: Date;
  endDate: Date;
  periodType: 'monthly';
  year: number;
  month: number;
  operating: {
    netAmount: number;
    inflow: Array<{
      category: string;
      amount: number;
      items: Array<{ name: string; amount: number }>;
    }>;
    outflow: Array<{
      category: string;
      amount: number;
      items: Array<{ name: string; amount: number }>;
    }>;
  };
  investing: {
    netAmount: number;
    inflow: Array<{
      category: string;
      amount: number;
      items: Array<{ name: string; amount: number }>;
    }>;
    outflow: Array<{
      category: string;
      amount: number;
      items: Array<{ name: string; amount: number }>;
    }>;
  };
  financing: {
    netAmount: number;
    inflow: Array<{
      category: string;
      amount: number;
      items: Array<{ name: string; amount: number }>;
    }>;
    outflow: Array<{
      category: string;
      amount: number;
      items: Array<{ name: string; amount: number }>;
    }>;
  };
  netChange: number;
  beginningBalance: number;
  endingBalance: number;
  adjustments: Array<{ name: string; amount: number }>;
  createdAt: Date;
  createdBy: string;
}

/**
 * Map FinancialReport to IncomeStatementView format
 */
export const mapToIncomeStatementView = (report: FinancialReport): IncomeStatementView | null => {
  if (report.type !== 'income_statement' || !('revenue' in report.data)) return null;
  const data = report.data as IncomeStatementData;

  return {
    id: report.id,
    startDate: report.startDate,
    endDate: report.endDate,
    periodType: 'monthly' as const,
    year: report.year,
    month: report.month,
    income: {
      total: data.revenue.total,
      categories: data.revenue.items.map((item) => ({
        category: item.category,
        subtotal: item.amount,
        items:
          item.subItems?.map((sub: { name: string; amount: number }, idx: number) => ({
            id: `${item.category}-${idx}`,
            category: item.category,
            subcategory: sub.name,
            amount: sub.amount,
          })) || [],
      })),
    },
    expense: {
      total: data.expenses.total,
      categories: data.expenses.items.map((item) => ({
        category: item.category,
        subtotal: item.amount,
        items:
          item.subItems?.map((sub: { name: string; amount: number }, idx: number) => ({
            id: `${item.category}-${idx}`,
            category: item.category,
            subcategory: sub.name,
            amount: sub.amount,
          })) || [],
      })),
    },
    netIncome: data.netIncome,
    createdAt: report.generatedAt,
    createdBy: report.generatedBy,
  };
};

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
      item.subItems?.forEach((sub) => {
        if (sub.sourceType === BalanceSheetSourceType.SYSTEM) {
          adjustments.push({ name: sub.name, amount: sub.amount });
        }
      });
    });
  };

  findAndExtractAdjustments(data.assets.items);
  findAndExtractAdjustments(data.liabilities.items);
  findAndExtractAdjustments(data.equity.items);

  // 2. Helper to map items to categories (Normal only)
  const mapNormalItems = (items: BalanceSheetItem[]) => {
    return items
      .map((item) => {
        const manualSubItems =
          item.subItems?.filter((sub) => sub.sourceType !== BalanceSheetSourceType.SYSTEM) || [];
        const manualAmount = manualSubItems.reduce((sum, sub) => sum + sub.amount, 0);

        return {
          category: item.category,
          subtotal: manualAmount,
          items: manualSubItems.map((sub, idx) => ({
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

/**
 * Map FinancialReport to CashFlowView format
 */
export const mapToCashFlowView = (report: FinancialReport): CashFlowView | null => {
  if (report.type !== 'cash_flow' || !('operating' in report.data)) return null;
  const data = report.data as CashFlowData;

  // 1. Separate adjustments (extract all system sub-items from everywhere)
  const adjustments: Array<{ name: string; amount: number }> = [];
  const findAndExtractAdjustments = (
    sections: Array<{ income: CashFlowItem[]; expense: CashFlowItem[] }>,
  ) => {
    sections.forEach((sec) => {
      [...sec.income, ...sec.expense].forEach((item) => {
        item.subItems?.forEach((sub) => {
          if (sub.sourceType === CashFlowSourceType.SYSTEM) {
            adjustments.push({ name: sub.name, amount: sub.amount });
          }
        });
      });
    });
  };

  findAndExtractAdjustments([data.operating, data.investing, data.financing]);

  // 2. Map sections (Manual only)
  const mapNormalSection = (items: CashFlowItem[]) => {
    return items
      .map((item) => {
        const manualSubItems =
          item.subItems?.filter((sub) => sub.sourceType !== CashFlowSourceType.SYSTEM) || [];
        const manualAmount = manualSubItems.reduce((sum, sub) => sum + sub.amount, 0);

        return {
          category: item.category,
          amount: manualAmount,
          items: manualSubItems.map((sub) => ({
            name: sub.name,
            amount: sub.amount,
          })),
        };
      })
      .filter((cat) => cat.items.length > 0 || cat.amount !== 0);
  };

  const mapSection = (section: { income: CashFlowItem[]; expense: CashFlowItem[] }) => {
    const inflow = mapNormalSection(section.income);
    const outflow = mapNormalSection(section.expense);
    const manualNet =
      inflow.reduce((sum, i) => sum + i.amount, 0) - outflow.reduce((sum, i) => sum + i.amount, 0);

    return {
      netAmount: manualNet,
      inflow,
      outflow,
    };
  };

  return {
    id: report.id,
    startDate: report.startDate,
    endDate: report.endDate,
    periodType: 'monthly' as const,
    year: report.year,
    month: report.month,
    operating: mapSection(data.operating),
    investing: mapSection(data.investing),
    financing: mapSection(data.financing),
    netChange: data.netChange, // Keep ground truth
    beginningBalance: data.beginningBalance,
    endingBalance: data.endingBalance,
    adjustments,
    createdAt: report.generatedAt,
    createdBy: report.generatedBy,
  };
};
