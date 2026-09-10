import { describe, expect, it } from 'vitest';

import {
  BalanceSheetDataSchema,
  CashFlowDataSchema,
  FinancialReportSchema,
  IncomeStatementDataSchema,
  ReportType,
} from './schemas';

const baseFields = {
  id: 'report-1',
  householdId: 'h1',
  yearMonth: '2025-06',
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2025-06-01'),
  updatedAt: new Date('2025-06-01'),
};

const incomeData = IncomeStatementDataSchema.parse({
  yearMonth: '2025-06',
  incomeTotal: 1000,
  expenseTotal: 500,
  netIncome: 500,
  incomeItems: [],
  expenseItems: [],
});

const balanceSheetData = BalanceSheetDataSchema.parse({
  yearMonth: '2025-06',
  assets: { total: 0, groups: {} },
  liabilities: { total: 0, groups: {} },
  equity: { total: 0, groups: {} },
});

const cashFlowData = CashFlowDataSchema.parse({
  yearMonth: '2025-06',
  operating: { label: 'Operating', total: 0, inflowItems: [], outflowItems: [] },
  investing: { label: 'Investing', total: 0, inflowItems: [], outflowItems: [] },
  financing: { label: 'Financing', total: 0, inflowItems: [], outflowItems: [] },
  netCashChange: 0,
  beginningBalance: 0,
  endingBalance: 0,
  actualBalance: 0,
  adjustment: 0,
});

describe('FinancialReportSchema — discriminated union', () => {
  it('parses income statement report', () => {
    const result = FinancialReportSchema.parse({
      ...baseFields,
      type: ReportType.INCOME_STATEMENT,
      data: incomeData,
    });
    expect(result.type).toBe(ReportType.INCOME_STATEMENT);
  });

  it('parses balance sheet report', () => {
    const result = FinancialReportSchema.parse({
      ...baseFields,
      type: ReportType.BALANCE_SHEET,
      data: balanceSheetData,
    });
    expect(result.type).toBe(ReportType.BALANCE_SHEET);
  });

  it('parses cash flow report', () => {
    const result = FinancialReportSchema.parse({
      ...baseFields,
      type: ReportType.CASH_FLOW,
      data: cashFlowData,
    });
    expect(result.type).toBe(ReportType.CASH_FLOW);
  });

  it('rejects mismatched type/data pair', () => {
    expect(() =>
      FinancialReportSchema.parse({
        ...baseFields,
        type: ReportType.INCOME_STATEMENT,
        data: balanceSheetData,
      }),
    ).toThrow();
  });

  it('rejects unknown report type', () => {
    expect(() =>
      FinancialReportSchema.parse({
        ...baseFields,
        type: 'UNKNOWN',
        data: incomeData,
      }),
    ).toThrow();
  });
});
