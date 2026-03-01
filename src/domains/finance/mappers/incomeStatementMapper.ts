import type { IncomeStatementData } from '@/domains/finance/types';
import type { FinancialReport } from '@/schemas/report';

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
