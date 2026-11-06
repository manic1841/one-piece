import { type FinancialReport, ReportType } from '@/domains/report/schemas';

const reportBase = (yearMonth: string, type: ReportType) => ({
  id: `${yearMonth}-${type}`,
  householdId: 'h1',
  yearMonth,
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const group = (label: string, total: number) => ({ label, total, items: [] });

export const buildBalanceSheetReport = (
  yearMonth: string,
  assets: number,
  liabilities: number,
  assetGroups: Record<string, number> = {},
): FinancialReport => ({
  ...reportBase(yearMonth, ReportType.BALANCE_SHEET),
  type: ReportType.BALANCE_SHEET,
  data: {
    yearMonth,
    assets: {
      total: assets,
      groups: Object.fromEntries(
        Object.entries(assetGroups).map(([key, total]) => [key, group(key, total)]),
      ),
    },
    liabilities: { total: liabilities, groups: {} },
    equity: { total: assets - liabilities, groups: {} },
  },
});

export const buildIncomeReport = (
  yearMonth: string,
  incomeTotal: number,
  expenseTotal: number,
): FinancialReport => ({
  ...reportBase(yearMonth, ReportType.INCOME_STATEMENT),
  type: ReportType.INCOME_STATEMENT,
  data: {
    yearMonth,
    incomeTotal,
    expenseTotal,
    netIncome: incomeTotal - expenseTotal,
    incomeItems: [],
    expenseItems: [],
  },
});

export const buildCashFlowReport = (yearMonth: string, netCashChange: number): FinancialReport => ({
  ...reportBase(yearMonth, ReportType.CASH_FLOW),
  type: ReportType.CASH_FLOW,
  data: {
    yearMonth,
    operating: { label: '營業', total: netCashChange, inflowItems: [], outflowItems: [] },
    investing: { label: '投資', total: 0, inflowItems: [], outflowItems: [] },
    financing: { label: '融資', total: 0, inflowItems: [], outflowItems: [] },
    netCashChange,
    beginningBalance: 0,
    endingBalance: netCashChange,
    actualBalance: netCashChange,
    adjustment: 0,
  },
});
