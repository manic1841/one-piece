import { describe, expect, it } from 'vitest';

import {
  RetirementExpenseType,
  RetirementIncomeType,
  type RetirementPlan,
} from '@/domains/retirement/types';

import { manageRetirementIncomesUseCase } from './manageRetirementIncomesUseCase';

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

describe('manageRetirementIncomesUseCase', () => {
  it('adds income with provided id', () => {
    const plan = createPlan();
    const next = manageRetirementIncomesUseCase.add({
      plan,
      id: 'income-2',
      incomeData: {
        name: 'Bonus',
        importedFrom: 'manual',
        incomeCalculationMode: 'FIXED',
        type: RetirementIncomeType.BONUS,
        startYear: 2026,
        endYear: 2060,
        baseAmount: 10000,
        growthRate: 0,
      },
    });

    expect(next).toHaveLength(2);
    expect(next[1].id).toBe('income-2');
  });

  it('updates income and preserves id', () => {
    const plan = createPlan();
    const next = manageRetirementIncomesUseCase.update({
      plan,
      incomeId: 'income-1',
      updates: {
        ...plan.incomes[0],
        name: 'Salary Updated',
        baseAmount: 130000,
      },
    });

    expect(next[0].id).toBe('income-1');
    expect(next[0].name).toBe('Salary Updated');
    expect(next[0].baseAmount).toBe(130000);
  });

  it('removes income by id', () => {
    const plan = createPlan();
    const next = manageRetirementIncomesUseCase.remove({
      plan,
      incomeId: 'income-1',
    });

    expect(next).toHaveLength(0);
  });
});
