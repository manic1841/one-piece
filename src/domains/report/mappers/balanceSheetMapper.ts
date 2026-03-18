import { type BalanceSheetData, type FinancialReport, ReportType } from '@/domains/report/schemas';

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
  if (report.type !== ReportType.BALANCE_SHEET || !('assets' in report.data)) return null;
  const data = report.data as BalanceSheetData;
  const [year, month] = report.yearMonth.split('-').map(Number);

  const mapGroups = (groups: BalanceSheetData['assets']['groups']) =>
    Object.entries(groups).map(([key, group]) => ({
      category: key,
      subtotal: group.total,
      items: group.items.map((item) => ({
        id: item.code,
        name: item.label,
        amount: item.amount,
      })),
    }));

  const allAssetGroups = mapGroups(data.assets.groups);
  const currentAssets = allAssetGroups.filter((g) => !g.category.toLowerCase().includes('real'));
  const investmentAssets = allAssetGroups.filter((g) =>
    g.category.toLowerCase().includes('invest'),
  );
  const fixedAssets = allAssetGroups.filter((g) => g.category.toLowerCase().includes('real'));

  const allLiabilityGroups = mapGroups(data.liabilities.groups);
  const shortTermLiabilities = allLiabilityGroups.filter(
    (g) => !g.category.toLowerCase().includes('long'),
  );
  const longTermLiabilities = allLiabilityGroups.filter((g) =>
    g.category.toLowerCase().includes('long'),
  );

  const totalManualEquity = data.equity;
  const finalEquityTotal = data.equity;

  return {
    id: report.id,
    asOfDate: new Date(year, month, 0),
    year,
    month,
    assets: {
      total: data.assets.total,
      current: currentAssets,
      investment: investmentAssets,
      fixed: fixedAssets,
    },
    liabilities: {
      total: data.liabilities.total,
      shortTerm: shortTermLiabilities,
      longTerm: longTermLiabilities,
    },
    equity: {
      total: totalManualEquity,
      items: [],
    },
    netWorth: finalEquityTotal,
    adjustments: [],
    createdAt: report.createdAt,
    createdBy: report.createdBy,
  };
};
