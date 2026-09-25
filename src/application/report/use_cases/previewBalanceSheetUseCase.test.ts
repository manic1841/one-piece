import { describe, expect, it } from 'vitest';

import { type IncomeStatementData } from '@/domains/report/schemas';

import { type ReportDataBundle } from './fetchReportDataUseCase';
import { previewBalanceSheetUseCase } from './previewBalanceSheetUseCase';

const baseIncome: IncomeStatementData = {
  yearMonth: '2025-06',
  incomeTotal: 1000,
  expenseTotal: 400,
  netIncome: 600,
  incomeItems: [],
  expenseItems: [],
};

const baseBundle: ReportDataBundle = {
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

describe('PreviewBalanceSheetUseCase', () => {
  it('computes assets, liabilities, and equity from bundle snapshots and entries', () => {
    const result = previewBalanceSheetUseCase.execute(
      {
        ...baseBundle,
        activeAccounts: [{ id: 'a1', name: 'Bank', category: 'bank' } as never],
        activeDebts: [{ id: 'd1', name: 'Loan' } as never],
        accountSnapshots: [{ accountId: 'a1', amount: 5000 }],
        debtSnapshots: [{ debtId: 'd1', closingBalance: 2000 }],
        portfolioSnapshots: [{ portfolioId: 'p1', gain: 300 }],
      },
      baseIncome,
    );

    expect(result.yearMonth).toBe('2025-06');
    expect(result.assets.total).toBe(5000);
    expect(result.liabilities.total).toBe(2000);
    expect(result.equity.total).toBe(3000);
  });

  it('uses prevBalanceSheet opening equity when provided', () => {
    const result = previewBalanceSheetUseCase.execute(
      {
        ...baseBundle,
        activeAccounts: [{ id: 'a1', name: 'Bank', category: 'bank' } as never],
        accountSnapshots: [{ accountId: 'a1', amount: 1000 }],
        prevBalanceSheet: {
          yearMonth: '2025-05',
          assets: { total: 0, groups: {} },
          liabilities: { total: 0, groups: {} },
          equity: { total: 800, groups: {} },
        },
      },
      baseIncome,
    );

    expect(result.equity.groups.openingEquity.total).toBe(800);
  });
});
