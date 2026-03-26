import { describe, expect, it } from 'vitest';

import {
  mapRetirementEventToVM,
  mapRetirementExpenseToVM,
  mapRetirementIncomeToVM,
  mapRetirementPlanToAssumptionsDisplayVM,
  mapRetirementPlanToHeaderVM,
  mapRetirementPlanToListItemVM,
  mapRetirementProjectionToVM,
} from './retirementDisplay.vm';

describe('retirementDisplay.vm', () => {
  it('maps plan list item vm', () => {
    const vm = mapRetirementPlanToListItemVM({
      id: 'p1',
      name: 'Plan A',
      householdId: 'h1',
      isActive: true,
      autoUpdate: false,
      currentYear: 2026,
      birthYear: 1990,
      retirementAge: 60,
      lifeExpectancy: 85,
      currentSavings: 100000,
      salaryGrowthRate: 3,
      inflationRate: 2,
      investmentReturnRate: 5,
      incomes: [],
      expenses: [],
      events: [],
      summary: {
        savingsAtRetirement: 500000,
        savingsAtDeath: 100000,
        isBankrupt: false,
      },
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      createdBy: 'u1',
    });

    expect(vm.retireYear).toBe(2050);
    expect(vm.projectedSavingsText).toContain('500,000');
    expect(vm.bankruptcyText).toBe('No Bankruptcy');
  });

  it('maps plan header vm', () => {
    const vm = mapRetirementPlanToHeaderVM({
      id: 'p1',
      name: 'Plan A',
      householdId: 'h1',
      isActive: true,
      autoUpdate: true,
      currentYear: 2026,
      birthYear: 1990,
      retirementAge: 60,
      lifeExpectancy: 85,
      currentSavings: 100000,
      salaryGrowthRate: 3,
      inflationRate: 2,
      investmentReturnRate: 5,
      incomes: [],
      expenses: [],
      events: [],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      createdBy: 'u1',
    });

    expect(vm.name).toBe('Plan A');
    expect(vm.autoUpdate).toBe(true);
    expect(vm.retirementSummaryText).toContain('Retire at 60');
  });

  it('maps plan assumptions display vm', () => {
    const vm = mapRetirementPlanToAssumptionsDisplayVM({
      id: 'p1',
      name: 'Plan A',
      householdId: 'h1',
      isActive: true,
      autoUpdate: true,
      currentYear: 2026,
      birthYear: 1990,
      retirementAge: 60,
      lifeExpectancy: 85,
      currentSavings: 100000,
      salaryGrowthRate: 3,
      inflationRate: 2,
      investmentReturnRate: 5,
      incomes: [],
      expenses: [],
      events: [],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      createdBy: 'u1',
    });

    expect(vm.currentYear).toBe(2026);
    expect(vm.currentSavingsText).toContain('100,000');
  });

  it('maps income/expense/event display items', () => {
    const income = mapRetirementIncomeToVM({
      id: 'i1',
      name: 'Salary',
      importedFrom: 'manual',
      type: 'salary',
      baseAmount: 120000,
      growthRate: 3,
      startYear: 2026,
      endYear: 2045,
    });
    expect(income.amountText).toContain('120,000');

    const expense = mapRetirementExpenseToVM({
      id: 'e1',
      name: 'Housing',
      baseAmount: 36000,
      growthRate: 2,
      retirementMultiplier: 0.8,
      startYear: 2026,
      endYear: null,
    });
    expect(expense.growthAndMultiplierText).toContain('80%');

    const event = mapRetirementEventToVM({
      id: 'ev1',
      name: 'House purchase',
      year: 2028,
      type: 'expense',
      amount: 200000,
      note: 'Down payment',
    });
    expect(event.amountText).toContain('200,000');
    expect(event.amountClassName).toBe('text-red-500');
  });

  it('maps projection vm', () => {
    const vm = mapRetirementProjectionToVM({
      id: 'p1',
      name: 'Plan A',
      householdId: 'h1',
      isActive: true,
      autoUpdate: false,
      currentYear: 2026,
      birthYear: 1990,
      retirementAge: 60,
      lifeExpectancy: 85,
      currentSavings: 100000,
      salaryGrowthRate: 3,
      inflationRate: 2,
      investmentReturnRate: 5,
      incomes: [],
      expenses: [],
      events: [],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      createdBy: 'u1',
    });

    expect(vm.retirementYear).toBe(2050);
    expect(vm.chartData.length).toBeGreaterThan(0);
    expect(vm.retirementSavingsText.length).toBeGreaterThan(0);
  });
});
