import { describe, expect, it } from 'vitest';

import { DEFAULT_INTENT_MAPPINGS } from '@/ui/features/transaction/viewmodels/transaction.vm';

import { MORE_EXPENSE_INTENTS, QUICK_EXPENSE_INTENTS } from './expenseCategoryGroups';

/**
 * Guard: every expense intent must appear in exactly one of the two lists, so a
 * newly added expense intent that is left unclassified fails the build.
 */
describe('expenseCategoryGroups', () => {
  const expenseIntents = DEFAULT_INTENT_MAPPINGS.filter(
    (mapping) => mapping.type === 'EXPENSE',
  ).map((mapping) => mapping.intent);

  it('covers every expense intent exactly once', () => {
    const combined = [...QUICK_EXPENSE_INTENTS, ...MORE_EXPENSE_INTENTS];
    expect(new Set(combined).size).toBe(combined.length);
    expect([...combined].sort()).toEqual([...expenseIntents].sort());
  });

  it('keeps the curated quick set at the agreed six', () => {
    expect([...QUICK_EXPENSE_INTENTS]).toEqual([
      'FOOD',
      'TRANSPORTATION',
      'SHOPPING',
      'ENTERTAINMENT',
      'LIVING',
      'SOCIAL',
    ]);
  });
});
