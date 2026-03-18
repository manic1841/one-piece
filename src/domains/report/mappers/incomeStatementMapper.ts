import {
  type FinancialReport,
  type IncomeStatementData,
  ReportType,
} from '@/domains/report/schemas';

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

/**
 * Map FinancialReport to IncomeStatementView format
 */
export const mapToIncomeStatementView = (report: FinancialReport): IncomeStatementView | null => {
  if (report.type !== ReportType.INCOME_STATEMENT || !('incomeItems' in report.data)) return null;
  const data = report.data as IncomeStatementData;
  const [year, month] = report.yearMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const toCategories = (items: IncomeStatementData['incomeItems']) =>
    items.map((item) => ({
      category: item.code,
      subtotal: item.amount,
      items:
        item.subItems?.map((sub, idx) => ({
          id: `${item.code}-${idx}`,
          category: item.code,
          subcategory: sub.label,
          amount: sub.amount,
        })) || [],
    }));

  return {
    id: report.id,
    startDate,
    endDate,
    periodType: 'monthly' as const,
    year,
    month,
    income: {
      total: data.incomeTotal,
      categories: toCategories(data.incomeItems),
    },
    expense: {
      total: data.expenseTotal,
      categories: toCategories(data.expenseItems),
    },
    netIncome: data.netIncome,
    createdAt: report.createdAt,
    createdBy: report.createdBy,
  };
};
