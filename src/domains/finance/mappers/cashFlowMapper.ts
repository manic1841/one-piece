import { CashFlowSourceType } from '@/domains/finance/financeType';
import type { CashFlowData } from '@/domains/finance/types';
import type { CashFlowItem } from '@/schemas/cashFlow';
import type { FinancialReport } from '@/schemas/report';

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
