import { describe, expect, it } from 'vitest';

import { RetirementPlanSchema } from './schemas';

const basePlan = {
  id: 'p1',
  createdBy: 'u1',
  updatedBy: 'u1',
  name: 'Plan A',
  isActive: true,
  autoUpdate: false,
  currentYear: 2026,
  birthYear: 1990,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflationRate: 2,
  investmentReturnRate: 5,
  incomes: [],
  expenses: [],
  events: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

describe('RetirementPlanSchema summary', () => {
  it('parses a stale summary cached before the rename (issue #130)', () => {
    const plan = RetirementPlanSchema.parse({
      ...basePlan,
      summary: {
        retirementYear: 2050,
        startingNetWorth: 100000,
        anchorYearMonth: '2025-12',
        savingsAtRetirement: 500000,
        minSavings: 100000,
        minSavingsYear: 2050,
        isBankrupt: false,
        lastCalculatedAt: new Date('2026-01-02'),
      },
    });

    expect(plan.summary?.netWorthAtRetirement).toBeUndefined();
    expect(plan.summary?.finalNetWorth).toBeUndefined();
  });

  it('parses a recalculated summary carrying both net-worth fields', () => {
    const plan = RetirementPlanSchema.parse({
      ...basePlan,
      summary: {
        retirementYear: 2050,
        startingNetWorth: 100000,
        anchorYearMonth: '2025-12',
        netWorthAtRetirement: 500000,
        finalNetWorth: 300000,
        minSavings: 100000,
        minSavingsYear: 2050,
        isBankrupt: false,
        lastCalculatedAt: new Date('2026-01-02'),
      },
    });

    expect(plan.summary?.netWorthAtRetirement).toBe(500000);
    expect(plan.summary?.finalNetWorth).toBe(300000);
  });
});
