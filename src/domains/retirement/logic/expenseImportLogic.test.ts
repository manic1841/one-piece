import { describe, expect, it } from 'vitest';

import { RetirementExpenseType } from '@/domains/retirement/types';

import { type PlannedExpense, groupExpenseSuggestions } from './expenseImportLogic';

describe('groupExpenseSuggestions', () => {
  it('groups entries by ledger code and rounds the annual total', () => {
    const entries: PlannedExpense[] = [
      { ledgerCode: 'expense:food', amount: 30_000.4 },
      { ledgerCode: 'expense:food', amount: 12_000.2 },
      { ledgerCode: 'expense:transportation', amount: 8_000 },
    ];

    const result = groupExpenseSuggestions(entries, 2025, 2026);

    expect(result).toHaveLength(2);
    const food = result.find((c) => c.expenseCategory === 'expense:food');
    const transport = result.find((c) => c.expenseCategory === 'expense:transportation');
    expect(food?.currentAnnual).toBe(42_001);
    expect(food?.name).toBe('Food');
    expect(transport?.currentAnnual).toBe(8_000);
    expect(transport?.name).toBe('Transportation');
  });

  it('keeps the full level after retirement (multiplier stored as a 0-1 factor)', () => {
    const result = groupExpenseSuggestions(
      [{ ledgerCode: 'expense:food', amount: 10_000 }],
      2025,
      2026,
    );

    expect(result[0]?.retirementMultiplier).toBe(1);
  });

  it('builds general lifelong categories anchored at the current year', () => {
    const result = groupExpenseSuggestions(
      [{ ledgerCode: 'expense:food', amount: 10_000 }],
      2025,
      2026,
    );

    expect(result[0]?.type).toBe(RetirementExpenseType.GENERAL);
    expect(result[0]?.startYear).toBe(2026);
    expect(result[0]?.endYear).toBeNull();
    expect(result[0]?.includesPrincipal).toBe(false);
    expect(result[0]?.interestOnly).toBe(false);
    expect(result[0]?.note).toContain('2025');
  });

  it('returns an empty array when no entries exist', () => {
    expect(groupExpenseSuggestions([], 2025, 2026)).toEqual([]);
  });
});
