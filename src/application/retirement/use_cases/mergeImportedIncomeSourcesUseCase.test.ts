import { describe, expect, it } from 'vitest';

import {
  RetirementExpenseType,
  type RetirementIncomeSource,
  RetirementIncomeType,
  type RetirementPlan,
} from '@/domains/retirement/types';

import { mergeImportedIncomeSourcesUseCase } from './mergeImportedIncomeSourcesUseCase';

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
      incomeCategory: 'salary:charles',
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

describe('mergeImportedIncomeSourcesUseCase', () => {
  it('replaces existing income by incomeCategory but keeps original id', () => {
    const plan = createPlan();

    const importedIncomes: RetirementIncomeSource[] = [
      {
        id: 'imported-x',
        name: 'Salary Updated',
        importedFrom: 'transactionEntries',
        incomeCalculationMode: 'IMPORTED',
        incomeCategory: 'salary:charles',
        type: RetirementIncomeType.SALARY,
        startYear: 2026,
        endYear: 2060,
        baseAmount: 150000,
        growthRate: 1,
      },
    ];

    const result = mergeImportedIncomeSourcesUseCase.execute({
      plan,
      importedIncomes,
    });

    expect(result.hasChanges).toBe(true);
    expect(result.incomes).toHaveLength(1);
    expect(result.incomes[0].id).toBe('income-1');
    expect(result.incomes[0].name).toBe('Salary Updated');
    expect(result.incomes[0].baseAmount).toBe(150000);
  });

  it('appends incomes when category does not exist', () => {
    const plan = createPlan();

    const importedIncomes: RetirementIncomeSource[] = [
      {
        id: 'imported-y',
        name: 'Bonus',
        importedFrom: 'transactionEntries',
        incomeCalculationMode: 'IMPORTED',
        incomeCategory: 'bonus:charles',
        type: RetirementIncomeType.BONUS,
        startYear: 2026,
        endYear: 2060,
        baseAmount: 20000,
        growthRate: 0,
      },
    ];

    const result = mergeImportedIncomeSourcesUseCase.execute({
      plan,
      importedIncomes,
    });

    expect(result.hasChanges).toBe(true);
    expect(result.incomes).toHaveLength(2);
    expect(result.incomes[1].id).toBe('imported-y');
  });

  it('returns original incomes when imported list is empty', () => {
    const plan = createPlan();

    const result = mergeImportedIncomeSourcesUseCase.execute({
      plan,
      importedIncomes: [],
    });

    expect(result.hasChanges).toBe(false);
    expect(result.incomes).toBe(plan.incomes);
  });
});
