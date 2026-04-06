import { describe, expect, it } from 'vitest';

import {
  RetirementExpenseType,
  RetirementIncomeType,
  type RetirementPlan,
} from '@/domains/retirement/types';

import { manageRetirementExpensesUseCase } from './manageRetirementExpensesUseCase';

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
      id: 'expense-1',
      name: 'Living',
      type: RetirementExpenseType.GENERAL,
      includesPrincipal: false,
      interestOnly: false,
      calculationMode: 'FIXED',
      baseAmount: 50000,
      growthRate: 2,
      retirementMultiplier: 1,
      startYear: 2026,
      endYear: null,
      salaryPercentageRetirementMode: 'INFLATION_BASED',
    },
  ],
  events: [],
});

describe('manageRetirementExpensesUseCase', () => {
  it('adds expense with provided id', () => {
    const plan = createPlan();
    const next = manageRetirementExpensesUseCase.add({
      plan,
      id: 'expense-2',
      expenseData: {
        name: 'Insurance',
        type: RetirementExpenseType.GENERAL,
        includesPrincipal: false,
        interestOnly: false,
        calculationMode: 'FIXED',
        baseAmount: 12000,
        growthRate: 1,
        retirementMultiplier: 1,
        startYear: 2026,
        endYear: null,
        salaryPercentageRetirementMode: 'INFLATION_BASED',
      },
    });

    expect(next).toHaveLength(2);
    expect(next[1].id).toBe('expense-2');
  });

  it('updates expense and preserves id', () => {
    const plan = createPlan();
    const next = manageRetirementExpensesUseCase.update({
      plan,
      expenseId: 'expense-1',
      updates: {
        ...plan.expenses[0],
        name: 'Living Updated',
        baseAmount: 60000,
      },
    });

    expect(next[0].id).toBe('expense-1');
    expect(next[0].name).toBe('Living Updated');
    expect(next[0].baseAmount).toBe(60000);
  });

  it('removes expense by id', () => {
    const plan = createPlan();
    const next = manageRetirementExpensesUseCase.remove({
      plan,
      expenseId: 'expense-1',
    });

    expect(next).toHaveLength(0);
  });
});
