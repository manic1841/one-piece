import { describe, expect, it } from 'vitest';

import {
  calculateBalanceSheet,
  calculateCashFlow,
  calculateIncomeStatement,
  calculateLiquidBalance,
} from './reportCalculations';
import { type JournalEntryLine } from '@/domains/ledger/schemas';

const entry = (
  ledgerCode: string,
  debit: number,
  credit: number,
): JournalEntryLine => ({ ledgerCode, debit, credit });

describe('calculateIncomeStatement', () => {
  it('aggregates income credits and expense debits into sorted items', () => {
    const entries = [
      entry('income:salary', 0, 5000),
      entry('income:bonus', 0, 1000),
      entry('expense:food', 800, 0),
      entry('expense:rent', 2000, 0),
      entry('asset:cash', 0, 5000), // ignored — not income or expense
    ];

    const result = calculateIncomeStatement({ yearMonth: '2026-03', entries });

    expect(result.yearMonth).toBe('2026-03');
    expect(result.incomeTotal).toBe(6000);
    expect(result.expenseTotal).toBe(2800);
    expect(result.netIncome).toBe(3200);
    expect(result.incomeItems.map((i) => i.code)).toEqual(['income:salary', 'income:bonus']);
    expect(result.expenseItems.map((i) => i.code)).toEqual(['expense:rent', 'expense:food']);
  });

  it('uses labelResolver when provided', () => {
    const entries = [entry('income:salary', 0, 1000)];
    const result = calculateIncomeStatement({
      yearMonth: '2026-03',
      entries,
      labelResolver: (code) => `LABEL:${code}`,
    });

    expect(result.incomeItems[0].label).toBe('LABEL:income:salary');
  });

  it('returns zero totals when there are no entries', () => {
    const result = calculateIncomeStatement({ yearMonth: '2026-03', entries: [] });

    expect(result.incomeTotal).toBe(0);
    expect(result.expenseTotal).toBe(0);
    expect(result.netIncome).toBe(0);
    expect(result.incomeItems).toEqual([]);
    expect(result.expenseItems).toEqual([]);
  });
});

describe('calculateBalanceSheet', () => {
  const baseInput = {
    yearMonth: '2026-03',
    entries: [] as JournalEntryLine[],
    monthlyEntries: [] as JournalEntryLine[],
    accounts: [
      { id: 'acc-cash', name: 'Cash', category: 'cash' },
      { id: 'acc-bank', name: 'Bank', category: 'bank' },
      { id: 'acc-sec', name: 'Securities', category: 'securities' },
    ],
    portfolios: [{ id: 'port-1', name: 'Portfolio 1' }],
    debtAccounts: [{ id: 'debt-1', name: 'Mortgage' }],
    accountSnapshots: [
      { accountId: 'acc-cash', amount: 1000 },
      { accountId: 'acc-bank', amount: 5000 },
      { accountId: 'acc-sec', amount: 3000 },
    ],
    debtSnapshots: [{ debtId: 'debt-1', closingBalance: 2000 }],
    portfolioSnapshots: [{ portfolioId: 'port-1', gain: 500 }],
    prevBalanceSheet: null,
    incomeStatement: {
      yearMonth: '2026-03',
      incomeTotal: 0,
      expenseTotal: 0,
      netIncome: 0,
      incomeItems: [],
      expenseItems: [],
    },
  };

  it('computes assets from account snapshots and property entries', () => {
    const entries = [entry('asset:property:house', 800000, 0)];

    const result = calculateBalanceSheet({ ...baseInput, entries });

    // cash + bank = 1000 + 5000 = 6000
    expect(result.assets.groups.cash.total).toBe(6000);
    // securities = 3000
    expect(result.assets.groups.investment.total).toBe(3000);
    // property = 800000
    expect(result.assets.groups.property.total).toBe(800000);
    expect(result.assets.total).toBe(809000);
  });

  it('computes liabilities from debt snapshots', () => {
    const result = calculateBalanceSheet(baseInput);

    expect(result.liabilities.total).toBe(2000);
    expect(result.liabilities.groups.loan.items[0].label).toBe('Mortgage');
  });

  it('derives equity as assets minus liabilities (ADR-0019 hybrid)', () => {
    const entries = [entry('asset:property:house', 800000, 0)];
    const result = calculateBalanceSheet({ ...baseInput, entries });

    expect(result.equity.total).toBe(809000 - 2000);
  });

  it('uses prevBalanceSheet equity as openingEquity', () => {
    const prevBalanceSheet = {
      yearMonth: '2026-02',
      assets: { total: 0, groups: {} },
      liabilities: { total: 0, groups: {} },
      equity: { total: 100000, groups: {} },
    };

    const result = calculateBalanceSheet({ ...baseInput, prevBalanceSheet });

    expect(result.equity.groups.openingEquity.total).toBe(100000);
  });

  it('computes capital from monthly equity entries (negated)', () => {
    const monthlyEntries = [entry('equity:capital', 0, 10000)]; // credit = capital injection

    const result = calculateBalanceSheet({ ...baseInput, monthlyEntries });

    // debit - credit = 0 - 10000 = -10000, negated = 10000
    expect(result.equity.groups.capital.total).toBe(10000);
  });

  it('computes adjustment as residual', () => {
    const entries = [entry('asset:property:house', 100000, 0)];
    const result = calculateBalanceSheet({ ...baseInput, entries });

    // totalEquity = (6000 + 3000 + 100000) - 2000 = 107000
    // openingEquity(0) + netIncome(0) + capital(0) + stockGain(500) = 500
    // adjustment = 107000 - 500 = 106500
    expect(result.equity.groups.adjustment.total).toBe(106500);
  });
});

describe('calculateCashFlow', () => {
  it('categorizes entries into operating, investing, and financing groups', () => {
    const entries = [
      entry('income:salary', 0, 5000), // operating inflow
      entry('expense:food', 800, 0), // operating outflow
      entry('asset:investment:stock', 2000, 0), // investing outflow
      entry('liability:mortgage', 0, 3000), // financing inflow
    ];

    const result = calculateCashFlow({
      yearMonth: '2026-03',
      entries,
      beginningBalance: 10000,
      actualBalance: 15200,
    });

    expect(result.operating.total).toBe(5000 - 800);
    expect(result.investing.total).toBe(-2000);
    expect(result.financing.total).toBe(3000);
    expect(result.netCashChange).toBe(4200 + (-2000) + 3000);
    expect(result.beginningBalance).toBe(10000);
    expect(result.endingBalance).toBe(10000 + 4200 + (-2000) + 3000);
    expect(result.actualBalance).toBe(15200);
    expect(result.adjustment).toBe(15200 - (10000 + 4200 + (-2000) + 3000));
  });

  it('handles empty entries with zero change', () => {
    const result = calculateCashFlow({
      yearMonth: '2026-03',
      entries: [],
      beginningBalance: 5000,
      actualBalance: 5000,
    });

    expect(result.netCashChange).toBe(0);
    expect(result.endingBalance).toBe(5000);
    expect(result.adjustment).toBe(0);
  });

  it('uses labelResolver for item labels', () => {
    const entries = [entry('income:salary', 0, 1000)];
    const result = calculateCashFlow({
      yearMonth: '2026-03',
      entries,
      beginningBalance: 0,
      actualBalance: 1000,
      labelResolver: (code) => `L:${code}`,
    });

    expect(result.operating.inflowItems[0].label).toBe('L:income:salary');
  });
});

describe('calculateLiquidBalance', () => {
  it('sums only bank and cash account snapshots', () => {
    const result = calculateLiquidBalance(
      [
        { id: 'a1', category: 'bank' },
        { id: 'a2', category: 'cash' },
        { id: 'a3', category: 'securities' },
      ],
      [
        { accountId: 'a1', amount: 500 },
        { accountId: 'a2', amount: 1000 },
        { accountId: 'a3', amount: 9999 },
      ],
    );

    expect(result).toBe(1500);
  });

  it('treats missing snapshots as zero', () => {
    const result = calculateLiquidBalance(
      [{ id: 'a1', category: 'bank' }],
      [],
    );

    expect(result).toBe(0);
  });
});
