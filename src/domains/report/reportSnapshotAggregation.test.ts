import { describe, expect, it } from 'vitest';

import { aggregateIncomeStatementSnapshots } from './reportSnapshotAggregation';
import { type IncomeStatementData, type IncomeStatementItem } from './schemas';

const incomeReport = (
  yearMonth: string,
  incomeItems: IncomeStatementItem[],
  expenseItems: IncomeStatementItem[] = [],
): IncomeStatementData => {
  const incomeTotal = incomeItems.reduce((sum, item) => sum + item.amount, 0);
  const expenseTotal = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  return {
    yearMonth,
    incomeTotal,
    expenseTotal,
    netIncome: incomeTotal - expenseTotal,
    incomeItems,
    expenseItems,
  };
};

describe('aggregateIncomeStatementSnapshots', () => {
  it('preserves signed amounts when a month nets negative (no Math.abs)', () => {
    const reports = [
      incomeReport('2026-01', [{ code: 'income:salary', label: 'Salary', amount: 1000 }]),
      incomeReport('2026-02', [{ code: 'income:salary', label: 'Salary', amount: -3000 }]),
    ];

    const result = aggregateIncomeStatementSnapshots('2026', reports);

    expect(result.incomeItems.find((item) => item.code === 'income:salary')?.amount).toBe(-2000);
    expect(result.incomeTotal).toBe(-2000);
  });

  it('preserves a net-negative expense row (refunds exceed spending)', () => {
    const reports = [
      incomeReport('2026-01', [], [{ code: 'expense:food', label: 'Food', amount: 800 }]),
      incomeReport('2026-02', [], [{ code: 'expense:food', label: 'Food', amount: -1300 }]),
    ];

    const result = aggregateIncomeStatementSnapshots('2026', reports);

    expect(result.expenseItems.find((item) => item.code === 'expense:food')?.amount).toBe(-500);
  });

  it('drops rows that net to zero', () => {
    const reports = [
      incomeReport('2026-01', [{ code: 'income:salary', label: 'Salary', amount: 1000 }]),
      incomeReport('2026-02', [{ code: 'income:salary', label: 'Salary', amount: -1000 }]),
    ];

    const result = aggregateIncomeStatementSnapshots('2026', reports);

    expect(result.incomeItems).toEqual([]);
  });
});
