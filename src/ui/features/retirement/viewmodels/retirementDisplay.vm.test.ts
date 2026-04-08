import { describe, expect, it } from 'vitest';

import { type RetirementProjection } from '@/domains/retirement/logic/retirementPlanProjection';

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
    const mockProjection: RetirementProjection[] = [
      {
        year: 2050,
        age: 60,
        isRetired: true,
        income: 0,
        expense: 0,
        netCashFlow: 0,
        investmentIncome: 25000,
        incomeBreakdown: [{ name: 'Salary', amount: 120000 }],
        expenseBreakdown: [{ name: 'Living', amount: 80000 }],
        savings: 500000,
        isBankrupt: false,
      },
      {
        year: 2051,
        age: 61,
        isRetired: true,
        income: 0,
        expense: 0,
        netCashFlow: 0,
        investmentIncome: 24000,
        incomeBreakdown: [{ name: 'Pension', amount: 50000 }],
        expenseBreakdown: [{ name: 'Living', amount: 82000 }],
        savings: 480000,
        isBankrupt: false,
      },
    ];
    const vm = mapRetirementProjectionToVM(mockProjection, 2050);

    expect(vm.retirementYear).toBe(2050);
    expect(vm.chartData.length).toBe(2);
    expect(vm.retirementSavingsText.length).toBeGreaterThan(0);
    expect(vm.yearlyDetails[0].investmentReturnText).toContain('25,000');
    expect(vm.yearlyDetails[0].incomeItems[0]?.name).toBe('Salary');
    expect(vm.yearlyDetails[0].expenseItems[0]?.name).toBe('Living');
  });

  it('includes both debt and salary-percentage living expense in retirement-year breakdown', () => {
    const mockProjection: RetirementProjection[] = [
      {
        year: 2050,
        age: 60,
        isRetired: true,
        income: 1200000,
        expense: 0,
        netCashFlow: 0,
        investmentIncome: 30000,
        incomeBreakdown: [{ name: 'Salary', amount: 1200000 }],
        expenseBreakdown: [{ name: 'Mortgage', amount: 300000 }],
        savings: 500000,
        isBankrupt: false,
      },
    ];

    const vm = mapRetirementProjectionToVM(mockProjection, 2050, {
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
      incomes: [
        {
          id: 'salary-1',
          name: 'Salary',
          importedFrom: 'manual',
          type: 'salary',
          baseAmount: 1200000,
          growthRate: 0,
          startYear: 2026,
          endYear: 2050,
        },
      ],
      expenses: [
        {
          id: 'debt-1',
          name: 'Mortgage',
          type: 'debt_payment',
          includesPrincipal: true,
          interestOnly: false,
          calculationMode: 'FIXED',
          salaryPercentageRetirementMode: 'MANUAL_FALLBACK',
          baseAmount: 300000,
          growthRate: 0,
          retirementMultiplier: 1,
          startYear: 2026,
          endYear: null,
        },
        {
          id: 'living-1',
          name: 'Living',
          type: 'general',
          includesPrincipal: false,
          interestOnly: false,
          calculationMode: 'SALARY_PERCENTAGE',
          salaryPercentageRetirementMode: 'INFLATION_BASED',
          salaryPercentage: 0.3,
          baseAmount: 0,
          growthRate: 2,
          retirementMultiplier: 1,
          startYear: 2026,
          endYear: null,
          linkedIncomeId: 'salary-1',
        },
      ],
      events: [],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      createdBy: 'u1',
    });

    expect(vm.expenseBreakdownChartData).not.toBeNull();
    expect(vm.expenseBreakdownChartData?.map((item) => item.name).sort()).toEqual([
      'Living',
      'Mortgage',
    ]);
  });
});
