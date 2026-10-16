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
      incomeCategory: 'salary:charles',
      type: RetirementIncomeType.SALARY,
      startYear: 2026,
      endYear: 2060,
      currentAnnual: 120000,
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
  it('updates a matched income in place, keeping its id and user assumptions', () => {
    const plan = createPlan();

    const importedIncomes: RetirementIncomeSource[] = [
      {
        id: 'imported-x',
        name: 'Salary Updated',
        incomeCategory: 'salary:charles',
        type: RetirementIncomeType.SALARY,
        startYear: 2026,
        endYear: 2060,
        currentAnnual: 150000,
        growthRate: 1,
        calculatedFrom: {
          ledgerCode: 'salary:charles',
          sampleYear: 2025,
          totalAmount: 150000,
          monthlyAverage: 12500,
          sampleCount: 12,
          importedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ];

    const result = mergeImportedIncomeSourcesUseCase.execute({
      plan,
      importedIncomes,
    });

    expect(result.hasChanges).toBe(true);
    expect(result.unmatchedCount).toBe(0);
    expect(result.incomes).toHaveLength(1);
    // id kept; base amount + source stats overwritten.
    expect(result.incomes[0].id).toBe('income-1');
    expect(result.incomes[0].currentAnnual).toBe(150000);
    expect(result.incomes[0].calculatedFrom?.sampleYear).toBe(2025);
    // user assumptions preserved (name is editable in the side editor too).
    expect(result.incomes[0].name).toBe('Salary');
    expect(result.incomes[0].growthRate).toBe(2);
    expect(result.incomes[0].endYear).toBe(2060);
  });

  it('appends incomes when the source does not exist yet', () => {
    const plan: RetirementPlan = { ...createPlan(), incomes: [] };

    const importedIncomes: RetirementIncomeSource[] = [
      {
        id: 'imported-y',
        name: 'Bonus',
        incomeCategory: 'bonus:charles',
        type: RetirementIncomeType.BONUS,
        startYear: 2026,
        endYear: 2060,
        currentAnnual: 20000,
        growthRate: 0,
      },
    ];

    const result = mergeImportedIncomeSourcesUseCase.execute({
      plan,
      importedIncomes,
    });

    expect(result.hasChanges).toBe(true);
    expect(result.unmatchedCount).toBe(0);
    expect(result.incomes).toHaveLength(1);
    expect(result.incomes[0].id).toBe('imported-y');
  });

  it('keeps rows whose source disappeared and reports them as unmatched', () => {
    const plan = createPlan();

    const result = mergeImportedIncomeSourcesUseCase.execute({ plan, importedIncomes: [] });

    expect(result.hasChanges).toBe(false);
    expect(result.unmatchedCount).toBe(1);
    expect(result.incomes).toEqual(plan.incomes);
  });

  it('reports no unmatched rows when the import list is empty and there are no sourced rows', () => {
    const emptyPlan: RetirementPlan = { ...createPlan(), incomes: [] };

    const result = mergeImportedIncomeSourcesUseCase.execute({
      plan: emptyPlan,
      importedIncomes: [],
    });

    expect(result.hasChanges).toBe(false);
    expect(result.unmatchedCount).toBe(0);
    expect(result.incomes).toHaveLength(0);
  });
});
