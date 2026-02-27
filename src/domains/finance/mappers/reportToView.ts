import { AssetSubCategory, LiabilitySubCategory } from '@/domains/finance/types';
import type {
  BalanceSheetData,
  BalanceSheetItem,
  CashFlowData,
  IncomeStatementData,
} from '@/domains/finance/types';
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
  netWorth: number;
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

  // Helper to map items to categories with sub-items
  const mapItems = (items: BalanceSheetItem[]) =>
    items.map((item) => ({
      category: item.category,
      subtotal: item.amount,
      items:
        item.subItems?.map((sub: { name: string; amount: number }, idx: number) => ({
          id: `${item.category}-${idx}`,
          name: sub.name,
          amount: sub.amount,
        })) || [],
    }));

  return {
    id: report.id,
    asOfDate: report.endDate,
    year: report.year,
    month: report.month,
    assets: {
      total: data.assets.total,
      current: mapItems(
        data.assets.items.filter(
          (i) =>
            i.category === AssetSubCategory.CASH || i.category === AssetSubCategory.OTHER_ASSETS,
        ),
      ),
      investment: mapItems(
        data.assets.items.filter((i) => i.category === AssetSubCategory.INVESTMENTS),
      ),
      fixed: mapItems(data.assets.items.filter((i) => i.category === AssetSubCategory.REAL_ESTATE)),
    },
    liabilities: {
      total: data.liabilities.total,
      shortTerm: mapItems(
        data.liabilities.items.filter(
          (i) =>
            i.category === LiabilitySubCategory.SHORT_TERM_DEBT ||
            i.category === LiabilitySubCategory.OTHER_LIABILITIES,
        ),
      ),
      longTerm: mapItems(
        data.liabilities.items.filter((i) => i.category === LiabilitySubCategory.LONG_TERM_DEBT),
      ),
    },
    netWorth: data.equity.total,
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

  const mapInternalSection = (items: CashFlowItem[]) => {
    return items.map((item) => ({
      category: item.category,
      amount: item.amount,
      items:
        item.subItems?.map((sub) => ({
          name: sub.name,
          amount: sub.amount,
        })) || [],
    }));
  };

  const mapSection = (section: {
    netAmount: number;
    income: CashFlowItem[];
    expense: CashFlowItem[];
  }) => ({
    netAmount: section.netAmount,
    inflow: mapInternalSection(section.income),
    outflow: mapInternalSection(section.expense),
  });

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
    netChange: data.netChange,
    beginningBalance: data.beginningBalance,
    endingBalance: data.endingBalance,
    createdAt: report.generatedAt,
    createdBy: report.generatedBy,
  };
};
