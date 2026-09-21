import { describe, expect, it } from 'vitest';

import type { RetirementPlan } from '../types';
import { calculateProjectionSummary, calculateRetirementProjection } from './retirementCalculator';

describe('retirementCalculator', () => {
  const SAMPLE_YEAR = 2023;

  const mockPlan = {
    id: 'test-plan',
    name: 'Test Plan',
    householdId: 'household-1',
    autoUpdate: false,
    isActive: true,
    createdBy: 'user1',
    updatedBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    currentYear: 2025,
    birthYear: 1995,
    retirementAge: 60,
    lifeExpectancy: 80,
    inflationRate: 2,
    investmentReturnRate: 5,
    incomes: [
      {
        id: 'income1',
        name: 'Salary',
        type: 'salary',
        lifelong: false,
        startYear: 2025,
        endYear: 2054, // Until retirement
        currentAnnual: 1_000_000,
        growthRate: 3,
        calculatedFrom: {
          ledgerCode: 'income:salary',
          sampleYear: SAMPLE_YEAR,
          totalAmount: 1_000_000,
          monthlyAverage: 1_000_000 / 12,
          sampleCount: 12,
          importedAt: '2024-01-01T00:00:00.000Z',
        },
      },
    ],
    expenses: [
      {
        id: 'expense1',
        name: 'Living',
        type: 'general',
        includesPrincipal: false,
        interestOnly: false,
        currentAnnual: 500_000,
        growthRate: 2,
        retirementMultiplier: 0.7,
        startYear: 2025,
        endYear: null, // Lifetime
      },
    ],
    events: [],
  } as unknown as RetirementPlan;

  const STARTING_NW = 1_000_000;

  it('should calculate projection for basic scenario', () => {
    const projection = calculateRetirementProjection(mockPlan, STARTING_NW);
    const expectedLength =
      mockPlan.lifeExpectancy - (mockPlan.currentYear - mockPlan.birthYear) + 1;

    expect(projection).toHaveLength(expectedLength);

    const firstYear = projection[0];
    expect(firstYear.year).toBe(2025);
    expect(firstYear.age).toBe(30);
    // currentAnnual compounds from the sample year
    expect(firstYear.totalIncome).toBeCloseTo(1_000_000 * Math.pow(1.03, 2025 - SAMPLE_YEAR), 0);
    expect(firstYear.totalExpense).toBeCloseTo(500_000 * Math.pow(1.02, 2025 - SAMPLE_YEAR), 0);
    expect(firstYear.investmentIncome).toBe(STARTING_NW * 0.05); // 5% of opening balance
    expect(firstYear.openingBalance).toBe(STARTING_NW);

    const retirementYear = projection.find((p) => p.age === 60);
    expect(retirementYear).toBeDefined();
    expect(retirementYear?.isRetired).toBe(true);

    // Expense multiplier applies immediately in the retirement year
    const yearsFromSample = 2055 - SAMPLE_YEAR;
    const expectedExpense = 500_000 * Math.pow(1.02, yearsFromSample) * 0.7;
    expect(retirementYear?.totalExpense).toBeCloseTo(expectedExpense, -1);
  });

  it('seeds the opening balance from the injected starting net worth', () => {
    const projection = calculateRetirementProjection(mockPlan, 250_000);
    expect(projection[0]?.openingBalance).toBe(250_000);
    expect(projection[0]?.investmentIncome).toBe(250_000 * 0.05);
  });

  it('should handle one-time events', () => {
    const planWithEvents = {
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
    } as unknown as RetirementPlan;

    const projection = calculateRetirementProjection(planWithEvents, STARTING_NW);

    const year2030 = projection.find((p) => p.year === 2030);
    expect(year2030?.oneTimeExpense).toBe(200000);
    expect(year2030?.events).toContain('Car');

    const year2040 = projection.find((p) => p.year === 2040);
    expect(year2040?.oneTimeIncome).toBe(500000);
    expect(year2040?.events).toContain('Inheritance');
  });

  it('should handle phased events', () => {
    const planWithPhases = {
      ...mockPlan,
      events: [
        {
          id: 'education',
          name: 'Education',
          type: 'expense',
          phases: [
            {
              name: 'Kindergarten',
              startYear: 2025,
              endYear: 2027,
              amount: 80_000,
              growthRate: 3,
            },
            {
              name: 'High school',
              startYear: 2028,
              endYear: 2030,
              amount: 120_000,
              growthRate: 0,
            },
          ],
        },
      ],
    } as unknown as RetirementPlan;

    const projection = calculateRetirementProjection(planWithPhases, STARTING_NW);

    const year2025 = projection.find((p) => p.year === 2025);
    expect(year2025?.oneTimeExpense).toBeCloseTo(80_000, 0);
    expect(year2025?.events).toContain('Education');

    const year2028 = projection.find((p) => p.year === 2028);
    expect(year2028?.oneTimeExpense).toBeCloseTo(120_000, 0);
    expect(year2028?.events).toContain('Education');
  });

  it('should calculate summary correctly', () => {
    const projection = calculateRetirementProjection(mockPlan, STARTING_NW);
    const summary = calculateProjectionSummary(
      projection,
      mockPlan,
      STARTING_NW,
      '2024-12',
    );

    expect(summary.retirementYear).toBe(2055);
    expect(summary.startingNetWorth).toBe(STARTING_NW);
    expect(summary.anchorYearMonth).toBe('2024-12');
    expect(summary.netWorthAtRetirement).toBeGreaterThan(0);
    expect(summary.finalNetWorth).toBe(projection[projection.length - 1].closingBalance);
    expect(summary.isBankrupt).toBe(false);
  });

  it('should detect bankruptcy', () => {
    const poorPlan = {
      ...mockPlan,
      incomes: [], // No income
      expenses: [
        {
          id: 'expense1',
          name: 'Living',
          type: 'general',
          includesPrincipal: false,
          interestOnly: false,
          currentAnnual: 500_000,
          growthRate: 2,
          retirementMultiplier: 1,
          startYear: 2025,
          endYear: null,
        },
      ],
    } as unknown as RetirementPlan;

    const projection = calculateRetirementProjection(poorPlan, 0);
    const summary = calculateProjectionSummary(projection, poorPlan, 0, '2024-12');

    expect(summary.isBankrupt).toBe(true);
    expect(summary.minSavings).toBeLessThan(0);
  });

  it('should apply concrete years and lifelong pension behaviors (v2: linked modes removed)', () => {
    const salaryAndPensionPlan = {
      ...mockPlan,
      retirementAge: 60,
      incomes: [
        {
          id: 'salary-concrete',
          name: 'Salary',
          type: 'salary',
          lifelong: false,
          startYear: 2025,
          // Migration (#132) wrote the retirement year (1995 + 60 = 2055) for
          // linked end modes; a concrete end at 2055 projects identically.
          endYear: 2055,
          currentAnnual: 1_000_000,
          growthRate: 0,
        },
        {
          id: 'pension-gap-lifelong',
          name: 'Pension',
          type: 'pension',
          lifelong: true,
          startYear: 2060,
          currentAnnual: 200_000,
          growthRate: 0,
        },
      ],
    } as unknown as RetirementPlan;

    const projection = calculateRetirementProjection(salaryAndPensionPlan, STARTING_NW);
    const retirementYear = salaryAndPensionPlan.birthYear + salaryAndPensionPlan.retirementAge;

    const beforeRetirement = projection.find((p) => p.year === retirementYear - 1);
    const atRetirement = projection.find((p) => p.year === retirementYear);
    const pensionStartYear = projection.find((p) => p.year === 2060);
    const endYear = projection[projection.length - 1]?.year;
    const endYearRow = projection.find((p) => p.year === endYear);

    expect(beforeRetirement?.totalIncome).toBeCloseTo(1_000_000, 0);
    expect(atRetirement?.totalIncome).toBeCloseTo(1_000_000, 0);
    expect(projection.find((p) => p.year === 2059)?.totalIncome).toBe(0);
    expect(pensionStartYear?.totalIncome).toBeCloseTo(200_000, 0);
    expect(endYearRow?.totalIncome).toBeCloseTo(200_000, 0);
  });
});
