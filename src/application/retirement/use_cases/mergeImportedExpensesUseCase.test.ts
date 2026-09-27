import { describe, expect, it } from 'vitest';

import { RetirementExpenseType, type RetirementPlan } from '@/domains/retirement/types';

import { mergeImportedExpensesUseCase } from './mergeImportedExpensesUseCase';

const buildPlan = (expenses: RetirementPlan['expenses']): RetirementPlan =>
  ({
    id: 'plan-1',
    householdId: 'household-1',
    name: 'Test Plan',
    currentYear: 2026,
    birthYear: 1985,
    retirementAge: 60,
    lifeExpectancy: 85,
    inflationRate: 2,
    investmentReturnRate: 5,
    incomes: [],
    expenses,
    events: [],
  }) as RetirementPlan;

const buildImported = (
  id: string,
  expenseCategory: string,
  currentAnnual: number,
): RetirementPlan['expenses'][number] => ({
  id,
  name: expenseCategory,
  type: RetirementExpenseType.GENERAL,
  includesPrincipal: false,
  interestOnly: false,
  expenseCategory,
  currentAnnual,
  retirementMultiplier: 1,
  startYear: 2026,
  endYear: null,
  note: `Based on 2025 full-year expense entries (1 samples)`,
});

describe('mergeImportedExpensesUseCase', () => {
  it('appends new categories as created entries', () => {
    const plan = buildPlan([]);
    const imported = [buildImported('new-1', 'expense:food', 42_000)];

    const result = mergeImportedExpensesUseCase.execute({ plan, importedExpenses: imported });

    expect(result.hasChanges).toBe(true);
    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0]?.id).toBe('new-1');
  });

  it('updates an existing category in place keeping its id and other fields', () => {
    const existing = {
      ...buildImported('existing-1', 'expense:food', 40_000),
      growthRate: 1,
      retirementMultiplier: 0.8,
    };
    const plan = buildPlan([existing]);
    const imported = [buildImported('imported-1', 'expense:food', 42_000)];

    const result = mergeImportedExpensesUseCase.execute({ plan, importedExpenses: imported });

    expect(result.hasChanges).toBe(true);
    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0]?.id).toBe('existing-1');
    expect(result.expenses[0]?.currentAnnual).toBe(42_000);
    expect(result.expenses[0]?.growthRate).toBe(1);
    expect(result.expenses[0]?.retirementMultiplier).toBe(0.8);
  });

  it('does not report changes when the annual total is unchanged', () => {
    const existing = buildImported('existing-1', 'expense:food', 42_000);
    const plan = buildPlan([existing]);
    const imported = [
      {
        ...buildImported('imported-1', 'expense:food', 42_000),
        retirementMultiplier: 0.5,
      },
    ];

    const result = mergeImportedExpensesUseCase.execute({ plan, importedExpenses: imported });

    expect(result.hasChanges).toBe(false);
    expect(result.expenses[0]?.id).toBe('existing-1');
  });

  it('skips imported expenses without an expenseCategory merge key', () => {
    const plan = buildPlan([]);
    const imported = [
      {
        ...buildImported('no-key-1', '', 10_000),
        expenseCategory: undefined,
      },
    ];

    const result = mergeImportedExpensesUseCase.execute({ plan, importedExpenses: imported });

    expect(result.hasChanges).toBe(false);
    expect(result.expenses).toHaveLength(0);
  });

  it('returns the plan unchanged when nothing is imported', () => {
    const existing = buildImported('existing-1', 'expense:food', 40_000);
    const plan = buildPlan([existing]);

    const result = mergeImportedExpensesUseCase.execute({ plan, importedExpenses: [] });

    expect(result.hasChanges).toBe(false);
    expect(result.expenses).toBe(plan.expenses);
  });
});
