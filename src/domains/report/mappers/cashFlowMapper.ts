import { type CashFlowData, type FinancialReport } from '@/domains/report/schemas';

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
  if (!('operating' in report.data)) return null;
  const data = report.data as CashFlowData;
  const [year, month] = report.yearMonth.split('-').map(Number);

  const mapSection = (section: CashFlowData['operating']) => {
    const inflow = section.inflowItems.map((item) => ({
      category: item.code,
      amount: item.amount,
      items: [{ name: item.label, amount: item.amount }],
    }));
    const outflow = section.outflowItems.map((item) => ({
      category: item.code,
      amount: item.amount,
      items: [{ name: item.label, amount: item.amount }],
    }));
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
    startDate: new Date(year, month - 1, 1),
    endDate: new Date(year, month, 0),
    periodType: 'monthly' as const,
    year,
    month,
    operating: mapSection(data.operating),
    investing: mapSection(data.investing),
    financing: mapSection(data.financing),
    netChange: data.netCashChange,
    beginningBalance: data.beginningBalance,
    endingBalance: data.endingBalance,
    adjustments: [],
    createdAt: report.createdAt,
    createdBy: report.createdBy,
  };
};
