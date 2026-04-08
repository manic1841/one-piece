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
      importedFrom: 'manual',
      incomeCalculationMode: 'FIXED',
      type: RetirementIncomeType.SALARY,
      startYear: 2026,
      endYear: 2060,
      baseAmount: 120000,
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
      calculationMode: 'FIXED',
      baseAmount: 12000,
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
  it('replaces existing expense by sourceDebtAccountId but keeps original id', () => {
    const plan = createPlan();

    const importedExpenses: RetirementExpenseCategory[] = [
      {
        id: 'imported-exp-1',
        name: 'Card A 還款 (Updated)',
        sourceDebtAccountId: 'debt-a',
        type: RetirementExpenseType.DEBT_PAYMENT,
        includesPrincipal: true,
        interestOnly: false,
        calculationMode: 'FIXED',
        baseAmount: 18000,
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
    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0].id).toBe('expense-debt-1');
    expect(result.expenses[0].name).toBe('Card A 還款 (Updated)');
    expect(result.expenses[0].baseAmount).toBe(18000);
  });

  it('appends expenses when debt account does not exist', () => {
    const plan = createPlan();

    const importedExpenses: RetirementExpenseCategory[] = [
      {
        id: 'imported-exp-2',
        name: 'Card B 還款',
        sourceDebtAccountId: 'debt-b',
        type: RetirementExpenseType.DEBT_PAYMENT,
        includesPrincipal: true,
        interestOnly: false,
        calculationMode: 'FIXED',
        baseAmount: 24000,
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
    expect(result.expenses).toHaveLength(2);
    expect(result.expenses[1].id).toBe('imported-exp-2');
  });

  it('returns original expenses when imported list is empty', () => {
    const plan = createPlan();

    const result = mergeImportedDebtRepaymentExpensesUseCase.execute({
      plan,
      importedExpenses: [],
    });

    expect(result.hasChanges).toBe(false);
    expect(result.expenses).toBe(plan.expenses);
  });
});
