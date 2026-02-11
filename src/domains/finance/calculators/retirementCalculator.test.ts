import { describe, expect, it } from 'vitest';

import { RetirementPlan } from '../../../schemas/retirementPlan';

import { calculateProjectionSummary, calculateRetirementProjection } from './retirementCalculator';

describe('retirementCalculator', () => {
  const mockPlan: RetirementPlan = {
    id: 'test-plan',
    name: 'Test Plan',
    isActive: true,
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    currentYear: 2025,
    currentAge: 30,
    retirementAge: 60,
    lifeExpectancy: 80,
    currentSavings: 1000000,
    salaryGrowthRate: 3,
    inflationRate: 2,
    investmentReturnRate: 5,
    incomes: [
      {
        id: 'income1',
        name: 'Salary',
        type: 'salary',
        startYear: 2025,
        endYear: 2054, // Until retirement
        baseAmount: 1000000,
        growthRate: 3,
      },
    ],
    expenses: [
      {
        id: 'expense1',
        name: 'Living',
        baseAmount: 500000,
        growthRate: 2,
        retirementMultiplier: 0.7,
        startYear: 2025,
        endYear: null, // Lifetime
      },
    ],
    events: [],
  };

  it('should calculate projection for basic scenario', () => {
    const projection = calculateRetirementProjection(mockPlan);
    expect(projection).toHaveLength(mockPlan.lifeExpectancy - mockPlan.currentAge + 1);

    // Check first year
    const firstYear = projection[0];
    expect(firstYear.year).toBe(2025);
    expect(firstYear.age).toBe(30);
    expect(firstYear.totalIncome).toBe(1000000); // Base amount
    expect(firstYear.totalExpense).toBe(500000); // Base amount
    expect(firstYear.investmentIncome).toBe(1000000 * 0.05); // 5% of opening balance

    // Check retirement year (2055, age 60)
    const retirementYear = projection.find((p) => p.age === 60);
    expect(retirementYear).toBeDefined();
    expect(retirementYear?.isRetired).toBe(true);

    // Check expense multiplier after retirement
    // Base 500k * (1.02)^30 * 0.7
    const expectedExpense = 500000 * Math.pow(1.02, 30) * 0.7;
    // Allow small floating point difference
    expect(retirementYear?.totalExpense).toBeCloseTo(expectedExpense, -1);
  });

  it('should handle one-time events', () => {
    const planWithEvents: RetirementPlan = {
      ...mockPlan,
      events: [
        {
          id: 'event1',
          year: 2030,
          type: 'expense',
          amount: 200000,
          name: 'Car',
        },
        {
          id: 'event2',
          year: 2040,
          type: 'income',
          amount: 500000,
          name: 'Inheritance',
        },
      ],
    };

    const projection = calculateRetirementProjection(planWithEvents);

    const year2030 = projection.find((p) => p.year === 2030);
    expect(year2030?.oneTimeExpense).toBe(200000);
    expect(year2030?.events).toContain('Car');

    const year2040 = projection.find((p) => p.year === 2040);
    expect(year2040?.oneTimeIncome).toBe(500000);
    expect(year2040?.events).toContain('Inheritance');
  });

  it('should calculate summary correctly', () => {
    const projection = calculateRetirementProjection(mockPlan);
    const summary = calculateProjectionSummary(projection, mockPlan);

    expect(summary.retirementYear).toBe(2055);
    expect(summary.savingsAtRetirement).toBeGreaterThan(0);
    expect(summary.isBankrupt).toBe(false);
  });

  it('should detect bankruptcy', () => {
    const poorPlan: RetirementPlan = {
      ...mockPlan,
      currentSavings: 0,
      incomes: [], // No income
      expenses: [
        {
          id: 'expense1',
          name: 'Living',
          baseAmount: 500000,
          growthRate: 2,
          retirementMultiplier: 1,
          startYear: 2025,
          endYear: null,
        },
      ],
    };

    const projection = calculateRetirementProjection(poorPlan);
    const summary = calculateProjectionSummary(projection, poorPlan);

    expect(summary.isBankrupt).toBe(true);
    expect(summary.minSavings).toBeLessThan(0);
  });
});
