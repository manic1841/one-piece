import { describe, expect, it } from 'vitest';

import { previewIncomeStatementUseCase } from './previewIncomeStatementUseCase';
import { type ReportDataBundle } from './fetchReportDataUseCase';

const emptyBundle: ReportDataBundle = {
  yearMonth: '2025-06',
  prevYearMonth: '2025-05',
  entriesByMonth: [],
  entriesUntilMonth: [],
  activeAccounts: [],
  activePortfolios: [],
  activeDebts: [],
  accountSnapshots: [],
  debtSnapshots: [],
  portfolioSnapshots: [],
  prevAccountSnapshots: [],
  prevBalanceSheet: null,
  prevCashFlow: null,
  hasAnyStoredReport: false,
};

describe('PreviewIncomeStatementUseCase', () => {
  it('computes income and expense totals from bundle entries', () => {
    const result = previewIncomeStatementUseCase.execute({
      ...emptyBundle,
      entriesByMonth: [
        { ledgerCode: 'income:salary', debit: 0, credit: 5000 },
        { ledgerCode: 'expense:food', debit: 800, credit: 0 },
      ],
    });

    expect(result.yearMonth).toBe('2025-06');
    expect(result.incomeTotal).toBe(5000);
    expect(result.expenseTotal).toBe(800);
    expect(result.netIncome).toBe(4200);
  });
});
