import { describe, expect, it } from 'vitest';

import {
  type RetirementExpenseCategory,
  RetirementExpenseType,
  RetirementIncomeType,
  type RetirementPlan,
} from '@/domains/retirement/types';

import { mergeImportedDebtRepaymentExpensesUseCase } from './mergeImportedDebtRepaymentExpensesUseCase';

const createPlan = (): RetirementPlan => ({
  id: 'plan-1',
  householdId: 'household-1',
  name: 'Test Plan',
  isActive: true,
  autoUpdate: false,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  currentYear: 2026,
  birthYear: 1985,
  retirementAge: 60,
  lifeExpectancy: 85,
  currentSavings: 0,
  salaryGrowthRate: 3,
  inflationRate: 2,
  investmentReturnRate: 5,
  incomes: [
    {
      id: 'income-1',
      name: 'Salary',
      type: RetirementIncomeType.SALARY,
      startYear: 2026,
      endYear: 2060,
      currentAnnual: 120000,
      growthRate: 2,
    },
  ],
  expenses: [
    {
      id: 'expense-debt-1',
      name: 'Card A 還款',
      sourceDebtAccountId: 'debt-a',
      type: RetirementExpenseType.DEBT_PAYMENT,
      includesPrincipal: true,
      interestOnly: false,
      currentAnnual: 12000,
      growthRate: 0,
      retirementMultiplier: 1,
      startYear: 2026,
      endYear: 2030,
      salaryPercentageRetirementMode: 'MANUAL_FALLBACK',
    },
  ],
  events: [],
});

describe('mergeImportedDebtRepaymentExpensesUseCase', () => {
  it('aligns on sourceDebtAccountId: keeps id, overwrites amount and import-owned end year', () => {
    const plan = createPlan();

    const importedExpenses: RetirementExpenseCategory[] = [
      {
        id: 'imported-exp-1',
        name: 'Card A 還款 (Updated)',
        sourceDebtAccountId: 'debt-a',
        type: RetirementExpenseType.DEBT_PAYMENT,
        includesPrincipal: true,
        interestOnly: false,
        currentAnnual: 18000,
        growthRate: 0,
        retirementMultiplier: 1,
        startYear: 2026,
        endYear: 2032,
        salaryPercentageRetirementMode: 'MANUAL_FALLBACK',
      },
    ];

    const result = mergeImportedDebtRepaymentExpensesUseCase.execute({
      plan,
      importedExpenses,
    });

    expect(result.hasChanges).toBe(true);
    expect(result.unmatchedCount).toBe(0);
    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0].id).toBe('expense-debt-1');
    expect(result.expenses[0].currentAnnual).toBe(18000);
    // endYear follows the debt account import, not the four semantics.
    expect(result.expenses[0].endYear).toBe(2032);
    // Name is user-editable in the side editor, so it stays.
    expect(result.expenses[0].name).toBe('Card A 還款');
  });

  it('preserves an existing growth rate assumption', () => {
    const plan = createPlan();
    plan.expenses[0].growthRate = 2;

    const importedExpenses: RetirementExpenseCategory[] = [
      {
        id: 'imported-exp-1',
        name: 'Card A 還款',
        sourceDebtAccountId: 'debt-a',
        type: RetirementExpenseType.DEBT_PAYMENT,
        includesPrincipal: true,
        interestOnly: false,
        currentAnnual: 18000,
        growthRate: 0,
        retirementMultiplier: 1,
        startYear: 2026,
        endYear: 2032,
      },
    ];

    const result = mergeImportedDebtRepaymentExpensesUseCase.execute({
      plan,
      importedExpenses,
    });

    expect(result.expenses[0].growthRate).toBe(2);
  });

  it('appends expenses when the debt account does not exist yet', () => {
    const plan: RetirementPlan = { ...createPlan(), expenses: [] };

    const importedExpenses: RetirementExpenseCategory[] = [
      {
        id: 'imported-exp-2',
        name: 'Card B 還款',
        sourceDebtAccountId: 'debt-b',
        type: RetirementExpenseType.DEBT_PAYMENT,
        includesPrincipal: true,
        interestOnly: false,
        currentAnnual: 24000,
        growthRate: 0,
        retirementMultiplier: 1,
        startYear: 2026,
        endYear: 2035,
        salaryPercentageRetirementMode: 'MANUAL_FALLBACK',
      },
    ];

    const result = mergeImportedDebtRepaymentExpensesUseCase.execute({
      plan,
      importedExpenses,
    });

    expect(result.hasChanges).toBe(true);
    expect(result.unmatchedCount).toBe(0);
    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0].id).toBe('imported-exp-2');
  });

  it('keeps rows whose debt account disappeared and reports them as unmatched', () => {
    const plan = createPlan();

    const result = mergeImportedDebtRepaymentExpensesUseCase.execute({
      plan,
      importedExpenses: [],
    });

    expect(result.hasChanges).toBe(false);
    expect(result.unmatchedCount).toBe(1);
    expect(result.expenses).toEqual(plan.expenses);
  });
});
