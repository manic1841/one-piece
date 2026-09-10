import { describe, expect, it } from 'vitest';

import { previewBalanceSheetUseCase } from './previewBalanceSheetUseCase';
import { type IncomeStatementData } from '@/domains/report/schemas';

const baseIncome: IncomeStatementData = {
  yearMonth: '2025-06',
  incomeTotal: 1000,
  expenseTotal: 400,
  netIncome: 600,
  incomeItems: [],
  expenseItems: [],
};

describe('PreviewBalanceSheetUseCase', () => {
  it('computes assets, liabilities, and equity from snapshots and entries', () => {
    const result = previewBalanceSheetUseCase.execute({
      yearMonth: '2025-06',
      entries: [],
      monthlyEntries: [],
      accounts: [{ id: 'a1', name: 'Bank', category: 'bank' }],
      portfolios: [{ id: 'p1', name: 'Stocks' }],
      debtAccounts: [{ id: 'd1', name: 'Loan' }],
      accountSnapshots: [{ accountId: 'a1', amount: 5000 }],
      debtSnapshots: [{ debtId: 'd1', closingBalance: 2000 }],
      portfolioSnapshots: [{ portfolioId: 'p1', gain: 300 }],
      prevBalanceSheet: null,
      incomeStatement: baseIncome,
    });

    expect(result.yearMonth).toBe('2025-06');
    expect(result.assets.total).toBe(5000);
    expect(result.liabilities.total).toBe(2000);
    expect(result.equity.total).toBe(3000);
  });

  it('uses prevBalanceSheet opening equity when provided', () => {
    const result = previewBalanceSheetUseCase.execute({
      yearMonth: '2025-06',
      entries: [],
      monthlyEntries: [],
      accounts: [{ id: 'a1', name: 'Bank', category: 'bank' }],
      portfolios: [],
      debtAccounts: [],
      accountSnapshots: [{ accountId: 'a1', amount: 1000 }],
      debtSnapshots: [],
      portfolioSnapshots: [],
      prevBalanceSheet: {
        yearMonth: '2025-05',
        assets: { total: 0, groups: {} },
        liabilities: { total: 0, groups: {} },
        equity: { total: 800, groups: {} },
      },
      incomeStatement: baseIncome,
    });

    expect(result.equity.groups.openingEquity.total).toBe(800);
  });
});
